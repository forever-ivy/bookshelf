from __future__ import annotations

from pydantic import BaseModel, Field


class ReaderProfileOut(BaseModel):
    id: int
    account_id: int
    display_name: str
    affiliation_type: str | None = None
    college: str | None = None
    major: str | None = None
    grade_year: str | None = None
    interest_tags: list[str] = []
    reading_profile_summary: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class ReaderProfileResponse(BaseModel):
    profile: ReaderProfileOut


class ReaderProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1)
    affiliation_type: str | None = None
    college: str | None = None
    major: str | None = None
    grade_year: str | None = None
    interest_tags: list[str] | None = None
    reading_profile_summary: str | None = None


class ReaderListItem(BaseModel):
    id: int
    account_id: int
    username: str
    display_name: str
    affiliation_type: str | None = None
    college: str | None = None
    major: str | None = None
    grade_year: str | None = None
    active_orders_count: int = 0
    last_active_at: str | None = None


class ReaderListResponse(BaseModel):
    items: list[ReaderListItem]


class ReaderDetailResponse(BaseModel):
    reader: ReaderListItem


class ReaderOverviewStats(BaseModel):
    active_orders_count: int = 0
    borrow_history_count: int = 0
    search_count: int = 0
    recommendation_count: int = 0
    conversation_count: int = 0
    reading_event_count: int = 0
    last_active_at: str | None = None


class ReaderOverviewItem(BaseModel):
    profile: ReaderProfileOut
    stats: ReaderOverviewStats
    recent_queries: list[str] = []
    recent_orders: list[dict] = []
    recent_recommendations: list[dict] = []
    recent_conversations: list[dict] = []
    recent_reading_events: list[dict] = []


class ReaderOverviewResponse(BaseModel):
    overview: ReaderOverviewItem
