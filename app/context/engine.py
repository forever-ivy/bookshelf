from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.context.repository import (
    get_active_orders,
    get_available_titles,
    get_borrow_history,
    get_latest_conversation,
    get_recent_reading_events,
    get_recent_searches,
    get_reader_profile,
)


@dataclass
class ContextSnapshot:
    profile: dict = field(default_factory=dict)
    search: dict = field(default_factory=dict)
    inventory: dict = field(default_factory=dict)
    orders: dict = field(default_factory=dict)
    conversation: dict = field(default_factory=dict)
    analytics: dict = field(default_factory=dict)


class ContextEngine:
    def __init__(self, session: Session) -> None:
        self.session = session

    def build_snapshot(self, *, reader_id: int | None = None, query: str | None = None) -> ContextSnapshot:
        return ContextSnapshot(
            profile=get_reader_profile(self.session, reader_id),
            search={
                "query": query,
                "recent_queries": get_recent_searches(self.session, reader_id),
            },
            inventory={
                "available_titles": get_available_titles(self.session),
            },
            orders={
                "active_orders": get_active_orders(self.session, reader_id),
                "borrow_history": get_borrow_history(self.session, reader_id),
            },
            conversation=get_latest_conversation(self.session, reader_id),
            analytics={
                "recent_reading_events": get_recent_reading_events(self.session, reader_id),
            },
        )
