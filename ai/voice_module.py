import asyncio
import json
import os
import queue
import re
import tempfile
import threading
import time
from pathlib import Path

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


def _load_vosk_model():
    global _vosk_model
    if _vosk_model is not None:
        return _vosk_model
    if Model is None or not _VOSK_MODEL_PATH.exists():
        return None
    _vosk_model = Model(str(_VOSK_MODEL_PATH))
    return _vosk_model


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


def listen(timeout=6, phrase_time_limit=10):
    """
    Offline ASR using VOSK CN model.
    timeout: max waiting time (seconds) for this call.
    phrase_time_limit: stop if no partial text grows for this many seconds.
    """
    model = _load_vosk_model()
    if model is None or KaldiRecognizer is None or sd is None:
        return None

    audio_q = queue.Queue()
    sample_rate = 16000
    block_size = 8000
    recognizer = KaldiRecognizer(model, sample_rate)
    recognizer.SetWords(False)

    start = time.time()
    last_partial = start

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
            callback=callback,
        ):
            while time.time() - start < timeout:
                try:
                    data = audio_q.get(timeout=0.4)
                except queue.Empty:
                    continue

                if recognizer.AcceptWaveform(data):
                    text = json.loads(recognizer.Result()).get("text", "").strip()
                    if text:
                        return text
                else:
                    partial = json.loads(recognizer.PartialResult()).get("partial", "")
                    if partial:
                        last_partial = time.time()

                if time.time() - last_partial > phrase_time_limit:
                    break
    except Exception as e:
        print("[ASR error]", e)
        return None

    final_text = json.loads(recognizer.FinalResult()).get("text", "").strip()
    return final_text or None
