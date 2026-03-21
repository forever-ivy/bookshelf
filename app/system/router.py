from sqlalchemy import text

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.module_catalog import MODULE_NAMES

router = APIRouter(prefix="/api/v1", tags=["system"])


@router.get("/health")
def healthcheck(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": "ok",
        "modules": MODULE_NAMES,
        "version": "0.1.0",
    }
