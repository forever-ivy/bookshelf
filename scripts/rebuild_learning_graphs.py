from __future__ import annotations

import argparse

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine, init_schema
from app.learning import repository
from app.learning.graph import LearningGraphService
from app.learning.models import LearningProfile
from app.learning.schemas import serialize_asset, serialize_fragment, serialize_path_step


def rebuild_graphs(*, profile_id: int | None = None) -> None:
    settings = get_settings()
    init_engine(settings)
    init_schema()
    graph_service = LearningGraphService(settings)
    session_factory = get_session_factory()
    session = session_factory()
    rebuilt = 0
    try:
        statement = select(LearningProfile).order_by(LearningProfile.id.asc())
        if profile_id is not None:
            statement = statement.where(LearningProfile.id == profile_id)
        profiles = session.execute(statement).scalars().all()
        for profile in profiles:
            if profile.active_path_version_id is None:
                continue
            path_version = repository.get_path_version(session, path_version_id=profile.active_path_version_id)
            if path_version is None:
                continue
            assets = [serialize_asset(asset) for asset in repository.list_bundle_assets(session, bundle_id=profile.source_bundle_id)]
            fragments = [serialize_fragment(fragment) for fragment in repository.list_profile_fragments(session, profile_id=profile.id)]
            steps = [serialize_path_step(step) for step in repository.list_path_steps(session, path_version_id=path_version.id)]
            concepts = list((path_version.metadata_json or {}).get("concepts") or (profile.metadata_json or {}).get("concepts") or [])
            graph_result = graph_service.build_snapshot(
                profile_id=profile.id,
                profile_title=profile.title,
                assets=assets,
                fragments=fragments,
                concepts=concepts,
                steps=steps,
            )
            path_version.graph_snapshot_json = graph_result.snapshot
            path_version.graph_provider = graph_result.provider
            session.flush()
            rebuilt += 1
        session.commit()
    finally:
        session.close()
    print(f"Rebuilt learning graphs for {rebuilt} profile(s).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild Neo4j typed graphs for learning profiles.")
    parser.add_argument("--profile-id", type=int, default=None, help="Optional single learning profile id to rebuild.")
    args = parser.parse_args()
    rebuild_graphs(profile_id=args.profile_id)


if __name__ == "__main__":
    main()
