from __future__ import annotations

import io
import os
from typing import Any, Protocol

try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional import during tests
    OpenAI = None  # type: ignore[assignment]

from app.core.config import get_settings
from app.core.errors import ApiError


class SpeechConnector(Protocol):
    def transcribe_wav_bytes(self, wav_bytes: bytes, hints=None) -> str:
        ...

    def tts_to_mp3_bytes(self, text: str) -> bytes:
        ...


class NullSpeechConnector:
    def transcribe_wav_bytes(self, wav_bytes: bytes, hints=None) -> str:
        raise ApiError(503, "speech_unavailable", "Speech transcription is not configured")

    def tts_to_mp3_bytes(self, text: str) -> bytes:
        return b""


class OpenAISpeechConnector:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str | None = None,
        transcription_model: str | None = None,
        tts_model: str | None = None,
        tts_voice: str | None = None,
        client: Any | None = None,
    ) -> None:
        self.transcription_model = transcription_model or os.getenv(
            "LIBRARY_SPEECH_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe"
        )
        self.tts_model = tts_model or os.getenv("LIBRARY_SPEECH_TTS_MODEL", "gpt-4o-mini-tts")
        self.tts_voice = tts_voice or os.getenv("LIBRARY_SPEECH_TTS_VOICE", "alloy")
        self.client = client or self._build_client(api_key=api_key, base_url=base_url)

    def _build_client(self, *, api_key: str, base_url: str | None) -> Any:
        if OpenAI is None:
            raise RuntimeError("openai package is not installed")
        kwargs: dict[str, Any] = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        return OpenAI(**kwargs)

    @staticmethod
    def _read_binary_response(response: Any) -> bytes:
        if hasattr(response, "read"):
            payload = response.read()
            if isinstance(payload, bytes):
                return payload
        content = getattr(response, "content", None)
        if isinstance(content, bytes):
            return content
        if hasattr(response, "iter_bytes"):
            return b"".join(response.iter_bytes())
        return b""

    def transcribe_wav_bytes(self, wav_bytes: bytes, hints=None) -> str:
        file_obj = io.BytesIO(wav_bytes)
        file_obj.name = "voice-input.wav"
        kwargs: dict[str, Any] = {"model": self.transcription_model, "file": file_obj}
        if hints:
            kwargs["prompt"] = "关键词：" + "，".join(str(hint) for hint in list(hints)[:50])
        response = self.client.audio.transcriptions.create(**kwargs)
        return str(getattr(response, "text", "") or "").strip()

    def tts_to_mp3_bytes(self, text: str) -> bytes:
        response = self.client.audio.speech.create(
            model=self.tts_model,
            voice=self.tts_voice,
            input=text,
            format="mp3",
        )
        return self._read_binary_response(response)


def build_speech_connector() -> SpeechConnector:
    settings = get_settings()
    if not settings.llm_api_key:
        return NullSpeechConnector()
    return OpenAISpeechConnector(api_key=settings.llm_api_key, base_url=settings.llm_base_url)
