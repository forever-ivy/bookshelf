import asyncio
import io
import json
import os
import queue
import re
import shutil
import subprocess
import tempfile
import threading
import time
import wave
from pathlib import Path
from typing import Iterable, Optional

try:
    import edge_tts
except Exception:
    edge_tts = None

try:
    from playsound import playsound
except Exception:
    playsound = None

try:
    import pyttsx3
except Exception:
    pyttsx3 = None

try:
    import sounddevice as sd
except Exception:
    sd = None

try:
    from vosk import KaldiRecognizer, Model
except Exception:
    KaldiRecognizer = None
    Model = None

# ── Whisper ASR（优先使用，准确率更高）──
_whisper_transcribe = None
_WHISPER_AVAILABLE = False


_tts_queue = queue.Queue()
_vosk_model = None
_VOSK_MODEL_PATH = Path(os.getenv("VOSK_MODEL_PATH", "models/vosk-cn"))
_VOSK_MODEL_CANDIDATES = [
    _VOSK_MODEL_PATH,
    Path.cwd() / "models" / "vosk-cn",
    Path.home() / "Desktop" / "models" / "vosk-cn",
]
_EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "zh-CN-XiaoxiaoNeural")
_EDGE_TTS_TIMEOUT_SECONDS = float(os.getenv("EDGE_TTS_TIMEOUT_SECONDS", "12"))
_EDGE_TTS_COOLDOWN_SECONDS = float(os.getenv("EDGE_TTS_COOLDOWN_SECONDS", "180"))
_EDGE_TTS_RETRY_ATTEMPTS = max(1, int(os.getenv("EDGE_TTS_RETRY_ATTEMPTS", "3")))
_EDGE_TTS_RETRY_BACKOFF_SECONDS = float(os.getenv("EDGE_TTS_RETRY_BACKOFF_SECONDS", "1.2"))
_EDGE_TTS_FAILURE_THRESHOLD = max(1, int(os.getenv("EDGE_TTS_FAILURE_THRESHOLD", "3")))
_EDGE_TTS_CONNECT_TIMEOUT_SECONDS = int(os.getenv("EDGE_TTS_CONNECT_TIMEOUT_SECONDS", "10"))
_EDGE_TTS_RECEIVE_TIMEOUT_SECONDS = int(os.getenv("EDGE_TTS_RECEIVE_TIMEOUT_SECONDS", "20"))
_SD_INPUT_DEVICE = os.getenv("SD_INPUT_DEVICE", "").strip()
_PIPER_BIN_ENV = os.getenv("PIPER_BIN", "").strip()
_PIPER_MODEL_ENV = os.getenv("PIPER_MODEL", "").strip()
_PIPER_CONFIG_ENV = os.getenv("PIPER_CONFIG", "").strip()
_PIPER_TIMEOUT_SECONDS = float(os.getenv("PIPER_TIMEOUT_SECONDS", "60"))
_WAKE_PHRASES = [
    "\u5c0f\u71d5\u5c0f\u71d5",
    "\u5c0f\u71d5",
]
_edge_tts_disabled_until = 0.0
_edge_tts_state_lock = threading.Lock()
_edge_tts_request_lock = threading.Lock()
_edge_tts_consecutive_failures = 0
_piper_lock = threading.Lock()
_pyttsx3_lock = threading.Lock()
_missing_vosk_logged = False
_piper_resolution_logged = False


def _load_vosk_model():
    global _vosk_model, _missing_vosk_logged
    if _vosk_model is not None:
        return _vosk_model
    if Model is None:
        if not _missing_vosk_logged:
            print("[ASR init] vosk package not available")
            _missing_vosk_logged = True
        return None
    for candidate in _VOSK_MODEL_CANDIDATES:
        if candidate.exists():
            print(f"[ASR init] loading Vosk model from {candidate}")
            _vosk_model = Model(str(candidate))
            return _vosk_model
    if not _missing_vosk_logged:
        joined = ", ".join(str(p) for p in _VOSK_MODEL_CANDIDATES)
        print(f"[ASR init] Vosk model not found. Checked: {joined}")
        _missing_vosk_logged = True
    return None


def _log_text(tag: str, text: str) -> None:
    clean = re.sub(r"\s+", " ", str(text or "")).strip()
    if clean:
        print(f"[{tag}] {clean}")


def _iter_piper_bin_candidates():
    candidates = []
    if _PIPER_BIN_ENV:
        candidates.append(Path(_PIPER_BIN_ENV))
    candidates.extend(
        [
            Path("tools/piper/piper/piper.exe"),
            Path("tools/piper/piper.exe"),
            Path("tools/piper/piper/piper"),
            Path.cwd() / "tools" / "piper" / "piper.exe",
            Path.cwd() / "tools" / "piper" / "piper" / "piper.exe",
            Path.cwd() / "tools" / "piper" / "piper" / "piper",
        ]
    )
    which = shutil.which("piper")
    if which:
        candidates.append(Path(which))
    seen = set()
    for candidate in candidates:
        key = str(candidate).lower()
        if key in seen:
            continue
        seen.add(key)
        yield candidate


def _iter_piper_model_candidates():
    candidates = []
    if _PIPER_MODEL_ENV:
        candidates.append(Path(_PIPER_MODEL_ENV))
    candidates.extend(
        [
            Path("tools/piper/models/zh_CN-huayan-medium.onnx"),
            Path("tools/piper/models/zh_CN-huayan-x_low.onnx"),
            Path("tools/piper/models/zh_CN-huayan-high.onnx"),
            Path.cwd() / "tools" / "piper" / "models" / "zh_CN-huayan-medium.onnx",
            Path.cwd() / "tools" / "piper" / "models" / "zh_CN-huayan-x_low.onnx",
            Path.cwd() / "tools" / "piper" / "models" / "zh_CN-huayan-high.onnx",
        ]
    )
    seen = set()
    for candidate in candidates:
        key = str(candidate).lower()
        if key in seen:
            continue
        seen.add(key)
        yield candidate


def _resolve_piper_assets():
    global _piper_resolution_logged
    piper_bin = None
    for candidate in _iter_piper_bin_candidates():
        if candidate.exists() and candidate.is_file():
            piper_bin = candidate
            break

    model_path = None
    for candidate in _iter_piper_model_candidates():
        if candidate.exists() and candidate.is_file():
            model_path = candidate
            break

    config_path = None
    if _PIPER_CONFIG_ENV:
        configured = Path(_PIPER_CONFIG_ENV)
        if configured.exists():
            config_path = configured
    elif model_path:
        sibling = Path(f"{model_path}.json")
        if sibling.exists():
            config_path = sibling
        else:
            alt = model_path.with_suffix(model_path.suffix + ".json")
            if alt.exists():
                config_path = alt

    if not _piper_resolution_logged:
        if piper_bin and model_path:
            print(f"[TTS piper] ready bin={piper_bin} model={model_path}")
        else:
            print("[TTS piper] not configured yet")
        _piper_resolution_logged = True
    return piper_bin, model_path, config_path


def _piper_available() -> bool:
    piper_bin, model_path, _ = _resolve_piper_assets()
    return bool(piper_bin and model_path)


def _edge_tts_on_cooldown() -> bool:
    return time.time() < _edge_tts_disabled_until


def _record_edge_tts_success() -> None:
    global _edge_tts_consecutive_failures
    with _edge_tts_state_lock:
        _edge_tts_consecutive_failures = 0


def _record_edge_tts_failure(reason) -> None:
    global _edge_tts_consecutive_failures, _edge_tts_disabled_until
    with _edge_tts_state_lock:
        _edge_tts_consecutive_failures += 1
        failures = _edge_tts_consecutive_failures
        should_disable = failures >= _EDGE_TTS_FAILURE_THRESHOLD
        if should_disable:
            until = time.time() + _EDGE_TTS_COOLDOWN_SECONDS
            _edge_tts_disabled_until = max(_edge_tts_disabled_until, until)
            remaining = int(max(0, _edge_tts_disabled_until - time.time()))
        else:
            remaining = 0

    if should_disable:
        print(f"[TTS edge disabled] cooldown={remaining}s reason={reason}")
    else:
        print(
            f"[TTS edge failure] consecutive={failures}/{_EDGE_TTS_FAILURE_THRESHOLD} reason={reason}"
        )


def _build_recognizer(model, sample_rate: int, hints: Optional[Iterable[str]] = None):
    if KaldiRecognizer is None:
        return None

    if hints:
        phrases = []
        seen = set()
        for item in hints:
            phrase = str(item or "").strip()
            if not phrase or phrase in seen:
                continue
            seen.add(phrase)
            phrases.append(phrase)

        if phrases:
            if "[unk]" not in seen:
                phrases.append("[unk]")
            grammar = json.dumps(phrases, ensure_ascii=False)
            try:
                return KaldiRecognizer(model, sample_rate, grammar)
            except TypeError:
                # Older vosk versions may not support grammar arg.
                pass

    return KaldiRecognizer(model, sample_rate)


# ── 专用 event loop，避免多线程 asyncio.run() 冲突 ──────
import concurrent.futures as _cf
_tts_event_loop = asyncio.new_event_loop()
_tts_executor   = _cf.ThreadPoolExecutor(max_workers=1, thread_name_prefix="edge_tts_loop")

def _run_async(coro):
    """在专用线程的 event loop 里跑协程，任何线程都能安全调用"""
    future = asyncio.run_coroutine_threadsafe(coro, _tts_event_loop)
    return future.result(timeout=_EDGE_TTS_TIMEOUT_SECONDS)

def _start_tts_loop():
    asyncio.set_event_loop(_tts_event_loop)
    _tts_event_loop.run_forever()

threading.Thread(target=_start_tts_loop, daemon=True, name="edge_tts_event_loop").start()


async def _edge_tts_to_file(text: str, out_file: str):
    communicate = edge_tts.Communicate(
        text=text,
        voice=_EDGE_TTS_VOICE,
        connect_timeout=_EDGE_TTS_CONNECT_TIMEOUT_SECONDS,
        receive_timeout=_EDGE_TTS_RECEIVE_TIMEOUT_SECONDS,
    )
    await communicate.save(out_file)


def _edge_tts_save_with_retry(text: str, out_file: str) -> None:
    last_error = None
    with _edge_tts_request_lock:
        for attempt in range(1, _EDGE_TTS_RETRY_ATTEMPTS + 1):
            try:
                _run_async(_edge_tts_to_file(text, out_file))
                if attempt > 1:
                    print(f"[TTS edge retry] recovered on attempt {attempt}/{_EDGE_TTS_RETRY_ATTEMPTS}")
                _record_edge_tts_success()
                return
            except Exception as exc:
                last_error = exc
                if attempt < _EDGE_TTS_RETRY_ATTEMPTS:
                    print(
                        f"[TTS edge retry] attempt {attempt}/{_EDGE_TTS_RETRY_ATTEMPTS} failed: {exc}"
                    )
                    time.sleep(_EDGE_TTS_RETRY_BACKOFF_SECONDS * attempt)
        _record_edge_tts_failure(last_error)
        raise last_error


def _speak_with_edge_tts(text: str) -> bool:
    if edge_tts is None or playsound is None:
        return False
    if _edge_tts_on_cooldown():
        print("[TTS edge skip] cooldown active, fallback to local speaker")
        return False
    mp3_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
            mp3_path = f.name
        _edge_tts_save_with_retry(text, mp3_path)
        playsound(mp3_path)
        return True
    except Exception as e:
        print("[TTS edge error]", e)
        return False
    finally:
        if mp3_path:
            try:
                os.remove(mp3_path)
            except Exception:
                pass


def tts_to_mp3_bytes(text: str):
    if edge_tts is None:
        return None
    if _edge_tts_on_cooldown():
        print("[TTS edge skip] cooldown active, fallback to wav bytes")
        return None
    clean = re.sub(r"[#*`]", "", str(text)).strip()
    if not clean:
        return None
    mp3_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
            mp3_path = f.name
        _edge_tts_save_with_retry(clean, mp3_path)
        with open(mp3_path, "rb") as fp:
            data = fp.read()
        return data
    except Exception as e:
        print("[TTS bytes error]", e)
        return None
    finally:
        if mp3_path:
            try:
                os.remove(mp3_path)
            except Exception:
                pass


def _tts_with_piper_to_wav_bytes(text: str):
    piper_bin, model_path, config_path = _resolve_piper_assets()
    if not piper_bin or not model_path:
        return None
    piper_bin = piper_bin.resolve()
    model_path = model_path.resolve()
    config_path = config_path.resolve() if config_path else None
    clean = re.sub(r"[#*`]", "", str(text)).strip()
    if not clean:
        return None

    wav_path = None
    cmd = [str(piper_bin), "--model", str(model_path)]
    if config_path:
        cmd.extend(["--config", str(config_path)])
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            wav_path = f.name
        cmd.extend(["--output_file", wav_path])
        with _piper_lock:
            completed = subprocess.run(
                cmd,
                input=clean,
                text=True,
                capture_output=True,
                cwd=str(piper_bin.parent),
                timeout=_PIPER_TIMEOUT_SECONDS,
                check=False,
                encoding="utf-8",
            )
        if completed.returncode != 0:
            stderr = (completed.stderr or completed.stdout or "").strip()
            print(f"[TTS piper error] {stderr or f'exit code {completed.returncode}'}")
            return None
        with open(wav_path, "rb") as fp:
            return fp.read()
    except Exception as e:
        print("[TTS piper error]", e)
        return None
    finally:
        if wav_path:
            try:
                os.remove(wav_path)
            except Exception:
                pass


def tts_to_wav_bytes(text: str):
    piper_bytes = _tts_with_piper_to_wav_bytes(text)
    if piper_bytes:
        return piper_bytes
    if pyttsx3 is None:
        return None
    clean = re.sub(r"[#*`]", "", str(text)).strip()
    if not clean:
        return None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            wav_path = f.name
        with _pyttsx3_lock:
            engine = pyttsx3.init()
            engine.setProperty("rate", 180)
            engine.setProperty("volume", 1.0)
            engine.save_to_file(clean, wav_path)
            engine.runAndWait()
            engine.stop()
            del engine
        with open(wav_path, "rb") as fp:
            data = fp.read()
        try:
            os.remove(wav_path)
        except Exception:
            pass
        return data
    except Exception as e:
        print("[TTS wav error]", e)
        return None


def _speak_with_piper(text: str) -> bool:
    if playsound is None or not _piper_available():
        return False
    wav_bytes = _tts_with_piper_to_wav_bytes(text)
    if not wav_bytes:
        return False
    wav_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            wav_path = f.name
            f.write(wav_bytes)
        playsound(wav_path)
        return True
    except Exception as e:
        print("[TTS piper play error]", e)
        return False
    finally:
        if wav_path:
            try:
                os.remove(wav_path)
            except Exception:
                pass


def _speak_with_pyttsx3(text: str) -> bool:
    if pyttsx3 is None:
        return False
    try:
        with _pyttsx3_lock:
            engine = pyttsx3.init()
            engine.setProperty("rate", 180)
            engine.setProperty("volume", 1.0)
            engine.say(text)
            engine.runAndWait()
            engine.stop()
            del engine
        return True
    except Exception as e:
        print("[TTS pyttsx3 error]", e)
        return False


def _tts_loop():
    while True:
        text = _tts_queue.get()
        if not text:
            continue
        _log_text("TTS", text)
        ok = _speak_with_edge_tts(text)
        if not ok:
            ok = _speak_with_piper(text)
        if not ok:
            _speak_with_pyttsx3(text)
        time.sleep(0.05)


threading.Thread(target=_tts_loop, daemon=True).start()


def speak(text: str):
    clean = re.sub(r"[#*`]", "", str(text)).strip()
    if clean:
        _tts_queue.put(clean)


def listen(timeout=8, phrase_time_limit=1.2, hints=None):
    """
    Offline ASR using VOSK CN model.
    timeout: max waiting time (seconds) for this call.
    phrase_time_limit: stop after this many seconds of silence since last text update.
    hints: optional phrase list to bias recognition (command hotwords, titles, etc.).
    """
    model = _load_vosk_model()
    if model is None or KaldiRecognizer is None or sd is None:
        return None

    audio_q = queue.Queue()
    sample_rate = 16000
    block_size = 4000
    recognizer = _build_recognizer(model, sample_rate, hints=hints)
    if recognizer is None:
        return None
    recognizer.SetWords(False)

    start = time.time()
    last_activity = start
    best_final = ""
    best_partial = ""
    last_partial = ""

    def callback(indata, frames, time_info, status):
        if status:
            return
        audio_q.put(bytes(indata))

    try:
        with sd.RawInputStream(
            samplerate=sample_rate,
            blocksize=block_size,
            dtype="int16",
            channels=1,
            device=int(_SD_INPUT_DEVICE) if _SD_INPUT_DEVICE else None,
            callback=callback,
        ):
            while time.time() - start < timeout:
                try:
                    data = audio_q.get(timeout=0.25)
                except queue.Empty:
                    continue

                if recognizer.AcceptWaveform(data):
                    text = json.loads(recognizer.Result()).get("text", "").strip()
                    if text:
                        best_final = text
                        last_activity = time.time()
                else:
                    partial = json.loads(recognizer.PartialResult()).get("partial", "")
                    if partial and partial != last_partial:
                        last_partial = partial
                        best_partial = partial
                        last_activity = time.time()

                # End when we already have text and then become silent.
                if (best_final or best_partial) and (time.time() - last_activity > phrase_time_limit):
                    break
    except Exception as e:
        print("[ASR error]", e)
        return None

    final_text = json.loads(recognizer.FinalResult()).get("text", "").strip()
    if final_text:
        best_final = final_text

    result = best_final or best_partial
    if not result:
        return None
    normalized = re.sub(r"\s+", "", result)
    _log_text("ASR mic", normalized)
    return normalized


def transcribe_pcm_bytes(pcm_bytes: bytes, sample_rate: int = 16000, hints=None, log_result: bool = True):
    model = _load_vosk_model()
    if model is None or KaldiRecognizer is None:
        return None
    if not pcm_bytes:
        return None

    recognizer = _build_recognizer(model, sample_rate, hints=hints)
    if recognizer is None:
        return None
    recognizer.SetWords(False)

    chunk = 4000
    for i in range(0, len(pcm_bytes), chunk):
        recognizer.AcceptWaveform(pcm_bytes[i : i + chunk])

    final_text = json.loads(recognizer.FinalResult()).get("text", "").strip()
    normalized = re.sub(r"\s+", "", final_text) or None
    if normalized and log_result:
        _log_text("ASR bytes", normalized)
    return normalized


def transcribe_wav_bytes(wav_bytes: bytes, hints=None, log_result: bool = True):
    if not wav_bytes:
        return None
    # 优先用 faster-whisper（更准、GPU下更快）
    if _WHISPER_AVAILABLE:
        try:
            result = _whisper_transcribe(wav_bytes, hints=hints) or None
            if result and log_result:
                _log_text("ASR wav", result)
            return result
        except Exception as _we:
            print(f"[whisper] 识别失败，降级到 Vosk: {_we}")
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            rate = wf.getframerate()
            channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            frames = wf.readframes(wf.getnframes())
    except Exception as e:
        raise ValueError(f"invalid wav: {e}") from e
    import audioop

    pcm = frames
    if sampwidth != 2:
        pcm = audioop.lin2lin(pcm, sampwidth, 2)
        sampwidth = 2
    if channels != 1:
        pcm = audioop.tomono(pcm, sampwidth, 0.5, 0.5)
        channels = 1
    if rate != 16000:
        pcm, _ = audioop.ratecv(pcm, sampwidth, channels, rate, 16000, None)
        rate = 16000

    result = transcribe_pcm_bytes(pcm, sample_rate=rate, hints=hints, log_result=log_result)
    if result and log_result:
        _log_text("ASR wav", result)
    return result


def _normalize_wake(text: str) -> str:
    s = (text or "").replace(" ", "")
    if not s:
        return ""
    # Normalize common homophones
    s = (
        s.replace("\u6653", "\u5c0f")
        .replace("\u7b71", "\u5c0f")
        .replace("\u6821", "\u5c0f")
        .replace("\u8096", "\u5c0f")
        .replace("\u6d88", "\u5c0f")
    )
    s = (
        s.replace("\u70df", "\u71d5")
        .replace("\u7136", "\u71d5")
        .replace("\u5ef6", "\u71d5")
        .replace("\u989c", "\u71d5")
        .replace("\u9e97", "\u71d5")
        .replace("\u708e", "\u71d5")
        .replace("\u8a00", "\u71d5")
        .replace("\u76d0", "\u71d5")
    )
    return s


def _has_wake(text: str, wake_words=None) -> bool:
    if wake_words is None:
        wake_words = _WAKE_PHRASES
    t = _normalize_wake(text)
    for w in wake_words:
        if _normalize_wake(w) in t:
            return True
    return False


def listen_wake_only(wake_words=None, timeout=30):
    """
    Block until wake phrase is detected or timeout. Returns True/False.
    """
    model = _load_vosk_model()
    if model is None or KaldiRecognizer is None or sd is None:
        return False

    audio_q = queue.Queue()
    sample_rate = 16000
    block_size = 8000
    wake_candidates = list(wake_words or _WAKE_PHRASES) + [
        "\u5c0f\u71d5",
        "\u6653\u71d5",
        "\u5c0f\u96c1",
        "\u5c0f\u8273",
        "\u5c0f\u71d5\u5c0f\u71d5",
        "\u6653\u71d5\u6653\u71d5",
    ]
    recognizer = _build_recognizer(model, sample_rate, hints=wake_candidates)
    if recognizer is None:
        return False
    recognizer.SetWords(False)
    last_partial_print = ""
    if wake_words:
        print(f"[wake] active wake words: {list(wake_words)}")
    else:
        print(f"[wake] active wake words: {_WAKE_PHRASES}")

    def callback(indata, frames, time_info, status):
        if status:
            return
        audio_q.put(bytes(indata))

    start = time.time()
    try:
        with sd.RawInputStream(
            samplerate=sample_rate,
            blocksize=block_size,
            dtype="int16",
            channels=1,
            device=int(_SD_INPUT_DEVICE) if _SD_INPUT_DEVICE else None,
            callback=callback,
        ):
            # 1) Wait for wake word
            print("[wake] listening for wake word...")
            while time.time() - start < timeout:
                try:
                    data = audio_q.get(timeout=0.4)
                except queue.Empty:
                    continue

                if recognizer.AcceptWaveform(data):
                    text = json.loads(recognizer.Result()).get("text", "").strip()
                    if text:
                        matched = _has_wake(text, wake_words)
                        print(f"[wake] final text: {text} | normalized={_normalize_wake(text)} | matched={matched}")
                    if text and _has_wake(text, wake_words):
                        return True
                else:
                    partial = json.loads(recognizer.PartialResult()).get("partial", "")
                    if partial and partial != last_partial_print:
                        last_partial_print = partial
                        matched = _has_wake(partial, wake_words)
                        print(f"[wake] partial: {partial} | normalized={_normalize_wake(partial)} | matched={matched}")
                    if partial and _has_wake(partial, wake_words):
                        return True
            else:
                return False
    except Exception as e:
        print("[ASR wake error]", e)
        return False

    return False
