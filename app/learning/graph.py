from __future__ import annotations

from collections import defaultdict
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


@dataclass(slots=True)
class GraphFragmentCandidate:
    fragment_id: int
    concepts: list[str]
    concept_hits: int
    keyword_hits: int


def _normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def _matches_keyword(text: str, keywords: list[str]) -> bool:
    normalized = _normalize_text(text)
    return any(keyword and _normalize_text(keyword) in normalized for keyword in keywords)


def _build_fragment_node(profile_id: int, fragment: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"fragment:{fragment['id']}",
        "type": "Fragment",
        "label": fragment.get("semanticSummary") or f"片段 {int(fragment.get('chunkIndex') or 0) + 1}",
        "profileId": profile_id,
        "fragmentId": fragment["id"],
        "assetId": fragment["assetId"],
        "chunkIndex": fragment["chunkIndex"],
        "chapterLabel": fragment.get("chapterLabel"),
        "semanticSummary": fragment.get("semanticSummary"),
    }


def _build_typed_graph(
    *,
    profile_id: int,
    profile_title: str,
    assets: list[dict[str, Any]],
    fragments: list[dict[str, Any]],
    concepts: list[str],
    steps: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = [
        {
            "id": "book:profile",
            "type": "Book",
            "label": profile_title,
            "profileId": profile_id,
            "bookId": profile_id,
        }
    ]
    edges: list[dict[str, Any]] = []

    concept_nodes: dict[str, dict[str, Any]] = {}
    for concept in concepts[:24]:
        concept_id = f"concept:{concept}"
        concept_nodes[concept_id] = {
            "id": concept_id,
            "type": "Concept",
            "label": concept,
            "profileId": profile_id,
            "concept": concept,
        }
    nodes.extend(concept_nodes.values())

    asset_nodes: dict[int, str] = {}
    for asset in assets:
        asset_node_id = f"asset:{asset['id']}"
        asset_nodes[int(asset["id"])] = asset_node_id
        nodes.append(
            {
                "id": asset_node_id,
                "type": "SourceAsset",
                "label": asset.get("fileName") or asset.get("assetKind") or f"资料 {asset['id']}",
                "profileId": profile_id,
                "assetId": asset["id"],
                "assetKind": asset.get("assetKind"),
                "fileName": asset.get("fileName"),
            }
        )
        edges.append({"source": asset_node_id, "target": "book:profile", "type": "DERIVED_FROM"})

    for fragment in fragments[:256]:
        fragment_node = _build_fragment_node(profile_id, fragment)
        nodes.append(fragment_node)
        edges.append(
            {
                "source": fragment_node["id"],
                "target": asset_nodes.get(int(fragment["assetId"]), "book:profile"),
                "type": "DERIVED_FROM",
            }
        )
        content_text = " ".join(
            [
                str(fragment.get("semanticSummary") or ""),
                str(fragment.get("content") or ""),
                str(fragment.get("chapterLabel") or ""),
            ]
        )
        matched_concepts = [
            concept_id
            for concept_id, concept_node in concept_nodes.items()
            if _matches_keyword(content_text, [concept_node["label"]])
        ]
        if not matched_concepts and concept_nodes:
            matched_concepts = list(concept_nodes.keys())[:1]
        for concept_id in matched_concepts[:4]:
            edges.append({"source": fragment_node["id"], "target": concept_id, "type": "MENTIONS"})

    for step in steps or []:
        step_id = f"step:{step['step_index']}"
        step_keywords = list(step.get("keywords_json") or [])
        nodes.append(
            {
                "id": step_id,
                "type": "LessonStep",
                "label": step["title"],
                "profileId": profile_id,
                "stepIndex": step["step_index"],
                "title": step["title"],
                "objective": step.get("objective"),
                "guidingQuestion": step.get("guiding_question"),
                "keywords": step_keywords,
            }
        )
        edges.append({"source": step_id, "target": "book:profile", "type": "TEACHES"})
        for keyword in step_keywords[:6]:
            concept_id = f"concept:{keyword}"
            if concept_id not in concept_nodes:
                concept_nodes[concept_id] = {
                    "id": concept_id,
                    "type": "Concept",
                    "label": keyword,
                    "profileId": profile_id,
                    "concept": keyword,
                }
                nodes.append(concept_nodes[concept_id])
            edges.append({"source": step_id, "target": concept_id, "type": "TESTS"})
    for left, right in zip((steps or [])[:-1], (steps or [])[1:]):
        edges.append({"source": f"step:{left['step_index']}", "target": f"step:{right['step_index']}", "type": "NEXT_STEP"})

    step_by_index = {step["step_index"]: step for step in steps or []}
    for step in steps or []:
        for prerequisite in step.get("prerequisite_step_ids") or []:
            left = step_by_index.get(prerequisite)
            right = step
            if left is None:
                continue
            left_keywords = list(left.get("keywords_json") or [])
            right_keywords = list(right.get("keywords_json") or [])
            for keyword in left_keywords:
                if keyword in right_keywords:
                    edges.append({"source": f"concept:{keyword}", "target": f"concept:{keyword}", "type": "PREREQUISITE_OF"})
    return {"provider": "fallback", "nodes": nodes, "edges": edges}


def build_fallback_graph(
    *,
    profile_id: int,
    profile_title: str,
    assets: list[dict[str, Any]],
    fragments: list[dict[str, Any]],
    concepts: list[str],
    steps: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return _build_typed_graph(
        profile_id=profile_id,
        profile_title=profile_title,
        assets=assets,
        fragments=fragments,
        concepts=concepts,
        steps=steps,
    )


def _node_props(node: dict[str, Any], *, profile_id: int) -> dict[str, Any]:
    props = {key: value for key, value in node.items() if key != "type"}
    props["profile_id"] = profile_id
    return props


def _coerce_node(props: dict[str, Any], labels: list[str]) -> dict[str, Any]:
    node = dict(props)
    node["type"] = next((label for label in labels if label != "LearningNode"), labels[0] if labels else "Node")
    node.pop("profile_id", None)
    return node


def _rank_fragment_candidates(
    *,
    snapshot: dict[str, Any],
    concept_ids: set[str],
    keywords: list[str],
) -> list[GraphFragmentCandidate]:
    node_by_id = {node["id"]: node for node in snapshot.get("nodes", [])}
    fragment_scores: dict[str, dict[str, Any]] = defaultdict(lambda: {"concepts": set(), "concept_hits": 0, "keyword_hits": 0})

    for edge in snapshot.get("edges", []):
        if edge.get("type") != "MENTIONS":
            continue
        source = edge.get("source")
        target = edge.get("target")
        fragment_node = node_by_id.get(source)
        concept_node = node_by_id.get(target)
        if fragment_node is None or concept_node is None or target not in concept_ids:
            continue
        bucket = fragment_scores[source]
        bucket["concepts"].add(concept_node["label"])
        bucket["concept_hits"] = len(bucket["concepts"])
        bucket["keyword_hits"] = sum(
            1
            for keyword in keywords
            if keyword and _normalize_text(keyword) in _normalize_text(concept_node["label"])
        )

    ranked: list[GraphFragmentCandidate] = []
    for node_id, score in fragment_scores.items():
        fragment_node = node_by_id.get(node_id)
        if fragment_node is None:
            continue
        ranked.append(
            GraphFragmentCandidate(
                fragment_id=int(fragment_node["fragmentId"]),
                concepts=sorted(score["concepts"]),
                concept_hits=int(score["concept_hits"]),
                keyword_hits=int(score["keyword_hits"]),
            )
        )
    ranked.sort(key=lambda item: (item.concept_hits, item.keyword_hits, -item.fragment_id), reverse=True)
    return ranked


class LearningGraphService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _is_enabled(self) -> bool:
        provider = (self.settings.graph_provider or "disabled").strip().lower()
        return provider == "neo4j" and GraphDatabase is not None and bool(self.settings.graph_uri)

    def _get_driver(self):
        if not self._is_enabled():
            return None
        kwargs: dict[str, Any] = {}
        if self.settings.graph_database:
            kwargs["database"] = self.settings.graph_database
        auth = None
        if self.settings.graph_username:
            auth = (self.settings.graph_username, self.settings.graph_password)
        return GraphDatabase.driver(self.settings.graph_uri, auth=auth, **kwargs)

    def build_snapshot(
        self,
        *,
        profile_id: int,
        profile_title: str,
        assets: list[dict[str, Any]],
        fragments: list[dict[str, Any]],
        concepts: list[str],
        steps: list[dict[str, Any]],
    ) -> GraphBuildResult:
        fallback = build_fallback_graph(
            profile_id=profile_id,
            profile_title=profile_title,
            assets=assets,
            fragments=fragments,
            concepts=concepts,
            steps=steps,
        )

        if not self._is_enabled():
            return GraphBuildResult(
                success=True,
                provider="fallback",
                snapshot=fallback,
                error_message=None,
            )

        driver = self._get_driver()
        if driver is None:
            return GraphBuildResult(
                success=False,
                provider="fallback",
                snapshot=fallback,
                error_message="Neo4j driver is unavailable or URI is missing",
            )
        try:
            with driver.session(database=self.settings.graph_database) as neo4j_session:
                neo4j_session.run("MATCH (n {profile_id: $profile_id}) DETACH DELETE n", profile_id=profile_id).consume()
                for node in fallback["nodes"]:
                    label = node["type"]
                    neo4j_session.run(
                        f"MERGE (n:{label} {{id: $id, profile_id: $profile_id}}) SET n += $props",
                        id=node["id"],
                        profile_id=profile_id,
                        props=_node_props(node, profile_id=profile_id),
                    ).consume()
                for edge in fallback["edges"]:
                    rel_type = edge["type"]
                    neo4j_session.run(
                        f"MATCH (a {{id: $source, profile_id: $profile_id}}) "
                        f"MATCH (b {{id: $target, profile_id: $profile_id}}) "
                        f"MERGE (a)-[r:{rel_type} {{profile_id: $profile_id}}]->(b)",
                        source=edge["source"],
                        target=edge["target"],
                        profile_id=profile_id,
                    ).consume()
            snapshot = self.get_profile_subgraph(profile_id=profile_id) or fallback
            snapshot["provider"] = "neo4j"
            return GraphBuildResult(success=True, provider="neo4j", snapshot=snapshot)
        except Exception as exc:  # pragma: no cover - external infra
            return GraphBuildResult(
                success=False,
                provider="fallback",
                snapshot=fallback,
                error_message=str(exc),
            )
        finally:
            driver.close()

    def get_profile_subgraph(self, *, profile_id: int) -> dict[str, Any] | None:
        if not self._is_enabled():
            return None
        driver = self._get_driver()
        if driver is None:
            return None
        try:
            with driver.session(database=self.settings.graph_database) as neo4j_session:
                node_rows = neo4j_session.run(
                    "MATCH (n {profile_id: $profile_id}) RETURN properties(n) AS props, labels(n) AS labels",
                    profile_id=profile_id,
                )
                nodes = [_coerce_node(dict(row["props"]), list(row["labels"])) for row in node_rows]
                edge_rows = neo4j_session.run(
                    "MATCH (a {profile_id: $profile_id})-[r]->(b {profile_id: $profile_id}) "
                    "RETURN a.id AS source, b.id AS target, type(r) AS type",
                    profile_id=profile_id,
                )
                edges = [{"source": row["source"], "target": row["target"], "type": row["type"]} for row in edge_rows]
                return {"provider": "neo4j", "nodes": nodes, "edges": edges}
        except Exception:  # pragma: no cover - external infra
            return None
        finally:
            driver.close()

    def list_step_fragment_candidates(
        self,
        *,
        profile_id: int,
        step_index: int,
        keywords: list[str] | None = None,
        limit: int = 12,
    ) -> list[GraphFragmentCandidate]:
        snapshot = self.get_profile_subgraph(profile_id=profile_id)
        if snapshot is None:
            return []
        keywords = list(keywords or [])
        node_by_id = {node["id"]: node for node in snapshot.get("nodes", [])}
        concept_ids = {
            edge["target"]
            for edge in snapshot.get("edges", [])
            if edge.get("type") == "TESTS" and edge.get("source") == f"step:{step_index}"
        }
        if not concept_ids and keywords:
            concept_ids = {
                node["id"]
                for node in snapshot.get("nodes", [])
                if node.get("type") == "Concept" and _matches_keyword(node.get("label"), keywords)
            }
        return _rank_fragment_candidates(snapshot=snapshot, concept_ids=concept_ids, keywords=keywords)[:limit]

    def list_focus_fragment_candidates(
        self,
        *,
        profile_id: int,
        keywords: list[str] | None = None,
        limit: int = 12,
    ) -> list[GraphFragmentCandidate]:
        snapshot = self.get_profile_subgraph(profile_id=profile_id)
        if snapshot is None:
            return []
        keywords = list(keywords or [])
        concept_ids = {
            node["id"]
            for node in snapshot.get("nodes", [])
            if node.get("type") == "Concept" and _matches_keyword(node.get("label"), keywords)
        }
        return _rank_fragment_candidates(snapshot=snapshot, concept_ids=concept_ids, keywords=keywords)[:limit]
