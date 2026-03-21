from __future__ import annotations

from app.core.database import get_session_factory
from app.robot_sim.service import tick_once


class RobotAutoProgressWorker:
    def tick(self) -> int:
        session = get_session_factory()()
        try:
            return tick_once(session)
        finally:
            session.close()
