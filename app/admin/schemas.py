from __future__ import annotations

from pydantic import BaseModel, Field

from app.recommendation.feed_contract import (
    RecommendationExplanationCard,
    RecommendationFeedCard,
    RecommendationFeedPayload,
)


class AdminRecommendationStudioBookSlot(BaseModel):
    book_id: int
    custom_explanation: str
    source: str
    rank: int


class AdminRecommendationStudioBooklistSlot(BaseModel):
    booklist_id: int
    rank: int


class AdminRecommendationStudioCandidateBook(BaseModel):
    book_id: int
    title: str
    author: str | None = None
    category: str | None = None
    available_copies: int = 0
    deliverable: bool = False
    eta_minutes: int | None = None
    default_explanation: str
    signals: dict[str, float] = Field(default_factory=dict)


class AdminRecommendationStudioCandidateBooklist(BaseModel):
    booklist_id: int
    title: str
    description: str | None = None
    book_count: int | None = None


class AdminRecommendationStudioDraft(BaseModel):
    today_recommendations: list[AdminRecommendationStudioBookSlot] = Field(default_factory=list)
    exam_zone: list[AdminRecommendationStudioBookSlot] = Field(default_factory=list)
    hot_lists: list[RecommendationFeedCard] = Field(default_factory=list)
    system_booklists: list[AdminRecommendationStudioBooklistSlot] = Field(default_factory=list)
    explanation_card: RecommendationExplanationCard
    placements: list[dict] = Field(default_factory=list)
    strategy_weights: dict[str, float] = Field(default_factory=dict)


class AdminRecommendationStudioPublication(BaseModel):
    id: int
    version: int | None = None
    status: str | None = None
    published_by_username: str | None = None
    published_at: str | None = None
    updated_at: str | None = None
    payload: AdminRecommendationStudioDraft | None = None


class AdminRecommendationStudioCandidates(BaseModel):
    today_recommendations: list[AdminRecommendationStudioCandidateBook] = Field(default_factory=list)
    exam_zone: list[AdminRecommendationStudioCandidateBook] = Field(default_factory=list)
    system_booklists: list[AdminRecommendationStudioCandidateBooklist] = Field(default_factory=list)


class AdminRecommendationStudioResponse(BaseModel):
    live_publication: AdminRecommendationStudioPublication | None = None
    draft: AdminRecommendationStudioDraft
    candidates: AdminRecommendationStudioCandidates
    preview_feed: RecommendationFeedPayload


class AdminRecommendationStudioDraftSaveResponse(BaseModel):
    draft: AdminRecommendationStudioDraft
    preview_feed: RecommendationFeedPayload


class AdminRecommendationStudioPublishResponse(BaseModel):
    publication: AdminRecommendationStudioPublication
    preview_feed: RecommendationFeedPayload


class AdminRecommendationStudioPublicationListResponse(BaseModel):
    items: list[AdminRecommendationStudioPublication] = Field(default_factory=list)
