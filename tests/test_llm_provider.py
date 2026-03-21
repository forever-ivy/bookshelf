from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.llm.provider import OpenAICompatibleLLMProvider, build_llm_provider


class FakeMessage:
    def __init__(self, content: str):
        self.content = content


class FakeChoice:
    def __init__(self, content: str):
        self.message = FakeMessage(content)


class FakeResponse:
    def __init__(self, content: str):
        self.choices = [FakeChoice(content)]


class FakeCompletions:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        messages = kwargs["messages"]
        if "OCR 文本" in messages[-1]["content"]:
            return FakeResponse('{"title":"深度学习","author":"Ian Goodfellow","category":"AI","keywords":"deep learning","description":"经典教材"}')
        return FakeResponse("因为这本书和用户的查询高度相关。")


class FakeChat:
    def __init__(self):
        self.completions = FakeCompletions()


class FakeClient:
    def __init__(self):
        self.chat = FakeChat()


def test_default_settings_prefer_cloud_sdk_provider(monkeypatch):
    monkeypatch.delenv("LIBRARY_LLM_PROVIDER", raising=False)
    monkeypatch.delenv("LIBRARY_LLM_API_KEY", raising=False)
    monkeypatch.delenv("LIBRARY_LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LIBRARY_LLM_MODEL", raising=False)
    get_settings.cache_clear()

    settings = get_settings()
    assert settings.llm_provider == "openai-compatible"
    with pytest.raises(RuntimeError):
        build_llm_provider()


def test_build_llm_provider_uses_openai_compatible_sdk(monkeypatch):
    from app.llm import provider as provider_module

    class FakeOpenAI:
        def __init__(self, *, api_key: str, base_url: str | None = None):
            self.api_key = api_key
            self.base_url = base_url
            self.chat = FakeChat()

    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "openai-compatible")
    monkeypatch.setenv("LIBRARY_LLM_API_KEY", "test-key")
    monkeypatch.setenv("LIBRARY_LLM_BASE_URL", "https://example.com/v1")
    monkeypatch.setenv("LIBRARY_LLM_MODEL", "gpt-test")
    monkeypatch.setattr(provider_module, "OpenAI", FakeOpenAI, raising=False)
    get_settings.cache_clear()

    provider = build_llm_provider()
    assert isinstance(provider, OpenAICompatibleLLMProvider)
    assert provider.client.api_key == "test-key"
    assert provider.client.base_url == "https://example.com/v1"


def test_openai_compatible_provider_uses_sdk_client_for_ocr_and_explanation():
    client = FakeClient()
    provider = OpenAICompatibleLLMProvider(
        api_key="test-key",
        model="gpt-test",
        base_url="https://example.com/v1",
        client=client,
    )

    parsed = provider.parse_book_from_ocr(["深度学习", "Ian Goodfellow"])
    assert parsed["title"] == "深度学习"
    assert parsed["author"] == "Ian Goodfellow"

    explanation = provider.explain(
        "推荐 AI 相关的书",
        type("Candidate", (), {"title": "深度学习", "explanation": "fallback explanation"})(),
        {"profile": {"display_name": "Alice"}},
    )
    assert explanation == "因为这本书和用户的查询高度相关。"
    assert len(client.chat.completions.calls) == 2
    assert client.chat.completions.calls[0]["model"] == "gpt-test"
