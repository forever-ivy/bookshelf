from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.config import Settings, get_settings

try:
    from neo4j import GraphDatabase  # type: ignore
except Exception:  # pragma: no cover - optional during tests
    GraphDatabase = None  # type: ignore[assignment]


@dataclass(slots=True)
class GraphBuildResult:
    success: bool
    provider: str
    snapshot: dict[str, Any]
    error_message: str | None = None


def build_fallback_graph(
    *,
    profile_title: str,
    assets: list[dict[str, Any]],
    fragments: list[dict[str, Any]],
    concepts: list[str],
    steps: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = [{"id": "book:profile", "type": "Book", "label": profile_title}]
    edges: list[dict[str, Any]] = []

    for asset in assets:
        asset_id = f"asset:{asset['id']}"
        nodes.append({"id": asset_id, "type": "SourceAsset", "label": asset.get("fileName") or asset.get("assetKind")})
        edges.append({"source": asset_id, "target": "book:profile", "type": "DERIVED_FROM"})

    for fragment in fragments[:12]:
        fragment_id = f"fragment:{fragment['id']}"
        asset_id = f"asset:{fragment['assetId']}"
        nodes.append(
            {
                "id": fragment_id,
                "type": "Fragment",
                "label": fragment.get("semanticSummary") or f"片段 {fragment['chunkIndex'] + 1}",
            }
        )
        edges.append({"source": fragment_id, "target": asset_id, "type": "DERIVED_FROM"})

    for concept in concepts[:8]:
        concept_id = f"concept:{concept}"
        nodes.append({"id": concept_id, "type": "Concept", "label": concept})
        edges.append({"source": concept_id, "target": "book:profile", "type": "TEACHES"})
        for fragment in fragments[:3]:
            edges.append({"source": f"fragment:{fragment['id']}", "target": concept_id, "type": "MENTIONS"})

    for step in steps or []:
        step_id = f"step:{step['step_index']}"
        nodes.append({"id": step_id, "type": "LessonStep", "label": step["title"]})
        edges.append({"source": step_id, "target": "book:profile", "type": "TEACHES"})
        for concept in (step.get("keywords_json") or [])[:2]:
            edges.append({"source": step_id, "target": f"concept:{concept}", "type": "TESTS"})

    return {"provider": "fallback", "nodes": nodes, "edges": edges}


class LearningGraphService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def build_snapshot(
        self,
        *,
        profile_title: str,
        assets: list[dict[str, Any]],
        fragments: list[dict[str, Any]],
        concepts: list[str],
        steps: list[dict[str, Any]],
    ) -> GraphBuildResult:
        fallback = build_fallback_graph(
            profile_title=profile_title,
            assets=assets,
            fragments=fragments,
            concepts=concepts,
            steps=steps,
        )

        provider = (self.settings.graph_provider or "disabled").strip().lower()
        if provider in {"", "disabled", "none", "null", "off"}:
            return GraphBuildResult(
                success=False,
                provider="fallback",
                snapshot=fallback,
                error_message="Graph provider is disabled",
            )

        if provider == "neo4j":
            if GraphDatabase is None or not self.settings.graph_uri:
                return GraphBuildResult(
                    success=False,
                    provider="fallback",
                    snapshot=fallback,
                    error_message="Neo4j driver is unavailable or URI is missing",
                )
            try:
                driver = GraphDatabase.driver(
                    self.settings.graph_uri,
                    auth=(self.settings.graph_username, self.settings.graph_password),
                )
                with driver.session() as neo4j_session:
                    neo4j_session.run("RETURN 1 AS ok").consume()
                driver.close()
            except Exception as exc:  # pragma: no cover - depends on external infra
                return GraphBuildResult(
                    success=False,
                    provider="fallback",
                    snapshot=fallback,
                    error_message=str(exc),
                )
            snapshot = dict(fallback)
            snapshot["provider"] = "neo4j"
            return GraphBuildResult(success=True, provider="neo4j", snapshot=snapshot)

        return GraphBuildResult(
            success=False,
            provider="fallback",
            snapshot=fallback,
            error_message=f"Unsupported graph provider: {self.settings.graph_provider}",
        )
