from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


DEFAULT_RECOMMENDATION_HOT_LISTS = [
    {"id": "popular-now", "title": "本周热门", "description": "近期馆内借阅最活跃的图书集合。"},
    {"id": "exam-focus", "title": "考试专区", "description": "适合考试周快速补强的主题内容。"},
    {"id": "reader-focus", "title": "与你相关", "description": "结合课程与阅读偏好精选。"},
]

DEFAULT_RECOMMENDATION_EXPLANATION_CARD = {
    "title": "为什么这些内容在这里",
    "body": "这一版推荐由管理员基于候选池审核发布，优先保证课程相关性和可借性。",
}


class RecommendationFeedBookItem(BaseModel):
    book_id: int
    title: str
    author: str | None = None
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    cabinet_label: str | None = None
    shelf_label: str | None = None
    deliverable: bool = False
    eta_minutes: int | None = None
    available_copies: int = 0
    explanation: str | None = None
    cover_tone: str | None = None


class RecommendationFeedCard(BaseModel):
    id: str
    title: str
    description: str


class RecommendationExplanationCard(BaseModel):
    title: str
    body: str


class RecommendationQuickAction(BaseModel):
    code: str
    title: str
    description: str
    meta: str | None = None
    source: Literal["system_generated"] = "system_generated"


class RecommendationFeedPayload(BaseModel):
    today_recommendations: list[RecommendationFeedBookItem] = Field(default_factory=list)
    exam_zone: list[RecommendationFeedBookItem] = Field(default_factory=list)
    explanation_card: RecommendationExplanationCard
    quick_actions: list[RecommendationQuickAction] = Field(default_factory=list)
    hot_lists: list[RecommendationFeedCard] = Field(default_factory=list)
    system_booklists: list[RecommendationFeedCard] = Field(default_factory=list)


def serialize_recommendation_feed_book(payload: dict, *, explanation: str | None = None) -> dict:
    return RecommendationFeedBookItem(
        book_id=int(payload["id"]),
        title=str(payload["title"]),
        author=payload.get("author"),
        summary=payload.get("summary"),
        tags=list(payload.get("tag_names") or payload.get("tags") or []),
        cabinet_label=payload.get("cabinet_label"),
        shelf_label=payload.get("shelf_label"),
        deliverable=bool(payload.get("delivery_available", False)),
        eta_minutes=payload.get("eta_minutes"),
        available_copies=int(payload.get("available_copies", 0) or 0),
        explanation=explanation,
        cover_tone=payload.get("cover_tone"),
    ).model_dump()


def serialize_recommendation_feed_card(*, card_id: str, title: str, description: str) -> dict:
    return RecommendationFeedCard(id=card_id, title=title, description=description).model_dump()


def copy_default_hot_lists() -> list[dict]:
    return [RecommendationFeedCard(**item).model_dump() for item in DEFAULT_RECOMMENDATION_HOT_LISTS]


def copy_default_explanation_card() -> dict:
    return RecommendationExplanationCard(**DEFAULT_RECOMMENDATION_EXPLANATION_CARD).model_dump()


def build_system_quick_actions(today_count: int, *, delivery_meta: str | None = None) -> list[dict]:
    return [
        RecommendationQuickAction(
            code="borrow_now",
            title="一键借书",
            description="优先查看当前可借并支持配送的图书。",
            meta=f"{today_count} 本推荐已准备好",
        ).model_dump(),
        RecommendationQuickAction(
            code="delivery_status",
            title="配送状态",
            description="查看借阅和归还履约的最新状态。",
            meta=delivery_meta or "系统生成入口",
        ).model_dump(),
        RecommendationQuickAction(
            code="recommendation_reason",
            title="推荐解释",
            description="了解这些推荐和你的课程、兴趣是如何关联的。",
            meta="解释型推荐",
        ).model_dump(),
    ]


def build_recommendation_feed_payload(
    *,
    today_recommendations: list[dict],
    exam_zone: list[dict],
    explanation_card: dict,
    quick_actions: list[dict],
    hot_lists: list[dict],
    system_booklists: list[dict],
) -> dict:
    return RecommendationFeedPayload(
        today_recommendations=[RecommendationFeedBookItem(**item) for item in today_recommendations],
        exam_zone=[RecommendationFeedBookItem(**item) for item in exam_zone],
        explanation_card=RecommendationExplanationCard(**explanation_card),
        quick_actions=[RecommendationQuickAction(**item) for item in quick_actions],
        hot_lists=[RecommendationFeedCard(**item) for item in hot_lists],
        system_booklists=[RecommendationFeedCard(**item) for item in system_booklists],
    ).model_dump()
