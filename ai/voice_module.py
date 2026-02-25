import asyncio
import json
import os
import queue
import re
import tempfile
import threading
import time
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


async def _edge_tts_to_file(text: str, out_file: str):
    communicate = edge_tts.Communicate(text=text, voice=_EDGE_TTS_VOICE)
    await communicate.save(out_file)


def _speak_with_edge_tts(text: str) -> bool:
    if edge_tts is None or playsound is None:
        return False

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
            mp3_path = f.name
        asyncio.run(_edge_tts_to_file(text, mp3_path))
        playsound(mp3_path)
        try:
            os.remove(mp3_path)
        except Exception:
            pass
        return True
    except Exception as e:
        print("[TTS edge error]", e)
        return False


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
