import asyncio
import io
import json
import os
import queue
import re
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
_EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "zh-CN-XiaoxiaoNeural")
_SD_INPUT_DEVICE = os.getenv("SD_INPUT_DEVICE", "").strip()
_WAKE_PHRASES = [
    "\u5c0f\u71d5\u5c0f\u71d5",
    "\u5c0f\u71d5",
]


def _load_vosk_model():
    global _vosk_model
    if _vosk_model is not None:
        return _vosk_model
    if Model is None or not _VOSK_MODEL_PATH.exists():
        return None
    _vosk_model = Model(str(_VOSK_MODEL_PATH))
    return _vosk_model


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
    return future.result(timeout=30)

def _start_tts_loop():
    asyncio.set_event_loop(_tts_event_loop)
    _tts_event_loop.run_forever()

threading.Thread(target=_start_tts_loop, daemon=True, name="edge_tts_event_loop").start()


async def _edge_tts_to_file(text: str, out_file: str):
    communicate = edge_tts.Communicate(text=text, voice=_EDGE_TTS_VOICE)
    await communicate.save(out_file)


def _speak_with_edge_tts(text: str) -> bool:
    if edge_tts is None or playsound is None:
        return False
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
            mp3_path = f.name
        _run_async(_edge_tts_to_file(text, mp3_path))
        playsound(mp3_path)
        try:
            os.remove(mp3_path)
        except Exception:
            pass
        return True
    except Exception as e:
        print("[TTS edge error]", e)
        return False


def tts_to_mp3_bytes(text: str):
    if edge_tts is None:
        return None
    clean = re.sub(r"[#*`]", "", str(text)).strip()
    if not clean:
        return None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
            mp3_path = f.name
        _run_async(_edge_tts_to_file(clean, mp3_path))
        with open(mp3_path, "rb") as fp:
            data = fp.read()
        try:
            os.remove(mp3_path)
        except Exception:
            pass
        return data
    except Exception as e:
        print("[TTS bytes error]", e)
        return None


def tts_to_wav_bytes(text: str):
    if pyttsx3 is None:
        return None
    clean = re.sub(r"[#*`]", "", str(text)).strip()
    if not clean:
        return None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            wav_path = f.name
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


def _speak_with_pyttsx3(text: str) -> bool:
    if pyttsx3 is None:
        return False
    try:
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
        ok = _speak_with_edge_tts(text)
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
    return re.sub(r"\s+", "", result)


def transcribe_pcm_bytes(pcm_bytes: bytes, sample_rate: int = 16000, hints=None):
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
    return re.sub(r"\s+", "", final_text) or None


def transcribe_wav_bytes(wav_bytes: bytes, hints=None):
    if not wav_bytes:
        return None
    # 优先用 faster-whisper（更准、GPU下更快）
    if _WHISPER_AVAILABLE:
        try:
            return _whisper_transcribe(wav_bytes, hints=hints) or None
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

    return transcribe_pcm_bytes(pcm, sample_rate=rate, hints=hints)


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
                        print(f"[wake] final text: {text}")
                    if text and _has_wake(text, wake_words):
                        return True
                else:
                    partial = json.loads(recognizer.PartialResult()).get("partial", "")
                    if partial and partial != last_partial_print:
                        last_partial_print = partial
                        print(f"[wake] partial: {partial}")
                    if partial and _has_wake(partial, wake_words):
                        return True
            else:
                return False
    except Exception as e:
        print("[ASR wake error]", e)
        return False

    return False