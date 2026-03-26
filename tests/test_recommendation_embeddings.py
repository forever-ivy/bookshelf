from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.recommendation.embeddings import (
    EMBEDDING_DIMENSIONS,
    LocalHashEmbeddingProvider,
    OpenAICompatibleEmbeddingProvider,
    build_book_embedding_text,
)


def test_build_book_embedding_text_ignores_empty_fields():
    text = build_book_embedding_text(
        title="活着",
        author="余华",
        category="I247.57",
        keywords="中国当代文学,生命",
        summary="讲述普通人在时代中的命运。",
    )

    assert text == (
        "title: 活着\n"
        "author: 余华\n"
        "category: I247.57\n"
        "keywords: 中国当代文学,生命\n"
        "summary: 讲述普通人在时代中的命运。"
    )


def test_embedding_provider_sorts_rows_by_index():
    fake_client = SimpleNamespace(
        embeddings=SimpleNamespace(
            create=lambda **_: SimpleNamespace(
                data=[
                    SimpleNamespace(index=1, embedding=[0.2] * EMBEDDING_DIMENSIONS),
                    SimpleNamespace(index=0, embedding=[0.1] * EMBEDDING_DIMENSIONS),
                ]
            )
        )
    )
    provider = OpenAICompatibleEmbeddingProvider(
        api_key="test-key",
        model="text-embedding-3-small",
        client=fake_client,
    )

    vectors = provider.embed_texts(["first", "second"])

    assert len(vectors) == 2
    assert vectors[0][0] == pytest.approx(0.1)
    assert vectors[1][0] == pytest.approx(0.2)


def test_embedding_provider_rejects_wrong_dimensions():
    fake_client = SimpleNamespace(
        embeddings=SimpleNamespace(
            create=lambda **_: SimpleNamespace(
                data=[SimpleNamespace(index=0, embedding=[0.1, 0.2, 0.3])]
            )
        )
    )
    provider = OpenAICompatibleEmbeddingProvider(
        api_key="test-key",
        model="text-embedding-3-small",
        client=fake_client,
    )

    with pytest.raises(RuntimeError, match="expected 1536, got 3"):
        provider.embed_texts(["single text"])


def test_local_hash_embedding_provider_returns_1536_dimensions():
    provider = LocalHashEmbeddingProvider()

    vectors = provider.embed_texts(
        [
            "title: 活着\nauthor: 余华\nkeywords: 中国当代文学,生命",
            "title: 三体\nauthor: 刘慈欣\nkeywords: 科幻,宇宙",
        ]
    )

    assert len(vectors) == 2
    assert len(vectors[0]) == EMBEDDING_DIMENSIONS
    assert len(vectors[1]) == EMBEDDING_DIMENSIONS
    assert sum(abs(value) for value in vectors[0]) > 0
    assert vectors[0] != vectors[1]
