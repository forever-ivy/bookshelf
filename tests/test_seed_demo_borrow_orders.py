from __future__ import annotations

import random
from datetime import datetime, timezone

from scripts.seed_demo_borrow_orders import DEFAULT_RANDOM_SEED, build_borrow_timeline


def test_build_borrow_timeline_stays_in_past() -> None:
    rng = random.Random(DEFAULT_RANDOM_SEED)
    now = datetime(2026, 3, 24, 12, 0, tzinfo=timezone.utc)

    for order_offset in range(24):
        timeline = build_borrow_timeline(rng, now=now, order_offset=order_offset)
        assert timeline.created_at < timeline.picked_at < timeline.completed_at <= now
