from __future__ import annotations

import re
from html import unescape

import httpx

from app.core.config import Settings, get_settings


TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_STYLE_RE = re.compile(r"<(script|style)[^>]*>.*?</\\1>", re.IGNORECASE | re.DOTALL)
WHITESPACE_RE = re.compile(r"\s+")
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)


class UrlFetchResult(dict):
    url: str
    title: str | None
    mime_type: str
    content: str
    raw_html: str


def extract_text_from_html(html: str) -> str:
    cleaned = SCRIPT_STYLE_RE.sub(" ", html or "")
    cleaned = re.sub(r"</(p|div|h1|h2|h3|h4|li|tr|section|article|br)>", "\n", cleaned, flags=re.IGNORECASE)
    text = TAG_RE.sub(" ", cleaned)
    text = unescape(text)
    text = WHITESPACE_RE.sub(" ", text)
    return text.strip()


class UrlContentFetcher:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def fetch(self, url: str) -> UrlFetchResult:
        response = httpx.get(
            url,
            headers={"User-Agent": "library-service-v2/learning-fetcher"},
            follow_redirects=True,
            timeout=self.settings.web_fetch_timeout_seconds,
        )
        response.raise_for_status()
        content_type = response.headers.get("content-type", "text/html")
        html = response.text
        title_match = TITLE_RE.search(html)
        title = unescape(title_match.group(1)).strip() if title_match else None
        text = extract_text_from_html(html)
        return UrlFetchResult(
            url=response.url.__str__(),
            title=title,
            mime_type=content_type.split(";")[0].strip(),
            content=text,
            raw_html=html,
        )
