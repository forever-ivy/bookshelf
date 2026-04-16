from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ApiError
from app.core.sse import sse_response
from app.learning.orchestrator import LearningOrchestrator
from app.learning.schemas import LearningStreamRequest


router = APIRouter(prefix="/internal/learning", tags=["learning-internal"])


@router.post("/sessions/{session_id}/stream")
async def stream_learning_session_internal(
    session_id: int,
    payload: LearningStreamRequest,
    reader_id: int,
    db: Session = Depends(get_db),
):
    if reader_id <= 0:
        raise ApiError(400, "reader_profile_required", "readerId is required")
    orchestrator = LearningOrchestrator()
    return sse_response(
        orchestrator.stream_session_reply(
            db,
            reader_id=reader_id,
            session_id=session_id,
            user_content=payload.content,
        )
    )
