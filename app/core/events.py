from __future__ import annotations

import asyncio
from collections import deque
from collections.abc import AsyncIterator


class EventBroker:
    def __init__(self, history_limit: int = 100) -> None:
        self._subscribers: set[asyncio.Queue[dict]] = set()
        self._history: deque[dict] = deque(maxlen=history_limit)

    def publish_nowait(self, event: dict) -> None:
        self._history.append(event)
        for subscriber in list(self._subscribers):
            subscriber.put_nowait(event)

    async def publish(self, event: dict) -> None:
        self.publish_nowait(event)

    async def subscribe(self) -> AsyncIterator[dict]:
        queue: asyncio.Queue[dict] = asyncio.Queue()
        self._subscribers.add(queue)
        try:
            for event in self._history:
                yield event
            while True:
                yield await queue.get()
        finally:
            self._subscribers.discard(queue)

    def history(self) -> list[dict]:
        return list(self._history)


broker = EventBroker()
