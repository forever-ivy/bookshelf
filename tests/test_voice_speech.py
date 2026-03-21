from __future__ import annotations

from app.core.config import get_settings
from app.voice import speech as speech_module
from app.voice.speech import OpenAISpeechConnector, build_speech_connector


class FakeTranscriptionResponse:
    text = "帮我取深度学习"


class FakeBinaryResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    def read(self) -> bytes:
        return self._payload


class FakeTranscriptionsAPI:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return FakeTranscriptionResponse()


class FakeSpeechAPI:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return FakeBinaryResponse(b"fake-mp3")


class FakeAudioAPI:
    def __init__(self):
        self.transcriptions = FakeTranscriptionsAPI()
        self.speech = FakeSpeechAPI()


class FakeClient:
    def __init__(self):
        self.audio = FakeAudioAPI()


def test_build_speech_connector_uses_openai_sdk(monkeypatch):
    class FakeOpenAI:
        def __init__(self, *, api_key: str, base_url: str | None = None):
            self.api_key = api_key
            self.base_url = base_url
            self.audio = FakeAudioAPI()

    monkeypatch.setenv("LIBRARY_LLM_API_KEY", "speech-key")
    monkeypatch.setenv("LIBRARY_LLM_BASE_URL", "https://example.com/v1")
    monkeypatch.setattr(speech_module, "OpenAI", FakeOpenAI, raising=False)
    get_settings.cache_clear()

    connector = build_speech_connector()
    assert isinstance(connector, OpenAISpeechConnector)
    assert connector.client.api_key == "speech-key"
    assert connector.client.base_url == "https://example.com/v1"


def test_openai_speech_connector_calls_sdk_for_asr_and_tts():
    client = FakeClient()
    connector = OpenAISpeechConnector(api_key="speech-key", client=client)

    text = connector.transcribe_wav_bytes(b"fake-wav", hints=["深度学习"])
    audio = connector.tts_to_mp3_bytes("帮你找到深度学习")

    assert text == "帮我取深度学习"
    assert audio == b"fake-mp3"
    assert client.audio.transcriptions.calls[0]["model"] == connector.transcription_model
    assert client.audio.speech.calls[0]["model"] == connector.tts_model
