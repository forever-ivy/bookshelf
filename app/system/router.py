from sqlalchemy import text

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.module_catalog import MODULE_NAMES
from app.learning.runtime import LearningRuntimeProbe

router = APIRouter(prefix="/api/v1", tags=["system"])


@router.get("/health")
def healthcheck(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    learning_runtime = LearningRuntimeProbe().snapshot()
    return {
        "status": "ok",
        "database": "ok",
        "learning": learning_runtime.to_dict(),
        "modules": MODULE_NAMES,
        "version": "0.1.0",
    }
