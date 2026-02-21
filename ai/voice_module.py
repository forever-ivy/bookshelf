# ai/voice_module.py
import threading
import queue
import re
import time

try:
    import pyttsx3
except:
    pyttsx3 = None

try:
    import speech_recognition as sr
except:
    sr = None


# ================== TTS 队列（但每次新建 engine） ==================

_tts_queue = queue.Queue()


def _tts_loop():
    while True:
        text = _tts_queue.get()
        if not text or not pyttsx3:
            continue

        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", 180)
            engine.setProperty("volume", 1.0)

            engine.say(text)
            engine.runAndWait()
            engine.stop()
            del engine
        except Exception as e:
            print("[TTS error]", e)
            time.sleep(0.3)


threading.Thread(target=_tts_loop, daemon=True).start()


def speak(text: str):
    """线程安全，永不阻塞 UI"""
    clean = re.sub(r'[#*`]', '', str(text)).strip()
    if clean:
        _tts_queue.put(clean)


# ================== ASR ==================

def listen(timeout=6, phrase_time_limit=10):
    if sr is None:
        return None

    r = sr.Recognizer()
    r.dynamic_energy_threshold = True

    try:
        mic = sr.Microphone()
    except:
        return None

    with mic as source:
        try:
            r.adjust_for_ambient_noise(source, duration=0.8)
            audio = r.listen(
                source,
                timeout=timeout,
                phrase_time_limit=phrase_time_limit
            )
        except:
            return None

    try:
        return r.recognize_google(audio, language="zh-CN")
    except:
        return None
