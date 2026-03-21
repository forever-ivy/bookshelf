from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi.responses import StreamingResponse


async def encode_sse(iterator: AsyncIterator[dict]) -> AsyncIterator[str]:
    async for event in iterator:
        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def sse_response(iterator: AsyncIterator[dict]) -> StreamingResponse:
    return StreamingResponse(encode_sse(iterator), media_type="text/event-stream")
