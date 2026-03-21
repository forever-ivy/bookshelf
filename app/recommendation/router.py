from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.llm.provider import build_llm_provider
from app.recommendation.service import RecommendationService

router = APIRouter(prefix="/api/v1/recommendation", tags=["recommendation"])


def resolve_llm_provider():
    try:
        return build_llm_provider()
    except RuntimeError as exc:
        raise ApiError(503, "llm_provider_misconfigured", str(exc)) from exc


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("/search")
def search(
    payload: SearchRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    service = RecommendationService(db, provider=resolve_llm_provider())
    return {
        "ok": True,
        **service.search(reader_id=identity.profile_id, query=payload.query, limit=payload.limit),
    }
