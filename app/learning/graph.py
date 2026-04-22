from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from app.core.config import Settings, get_settings

try:
    from neo4j import GraphDatabase  # type: ignore
except Exception:  # pragma: no cover - optional during tests
    GraphDatabase = None  # type: ignore[assignment]


GRAPH_SCHEMA_VERSION = 2
GRAPH_EXTRACTOR = "structured-graph-v2"
GRAPH_ID_SANITIZER = re.compile(r"[^\w\u4e00-\u9fff-]+", re.UNICODE)
METHOD_PATTERN = re.compile(r"(?:方法|算法|步骤|流程|strategy|method)", re.IGNORECASE)
CLAIM_PATTERN = re.compile(r"(?:结果表明|说明了?|由此可见|因此|本文提出|我们提出|实验显示)")
FORMULA_PATTERN = re.compile(r"\$\$|\\\[|\\\]|\\begin\{equation|\\lim|\\sum|\\int|=")
SEMANTIC_NODE_CONFIDENCE = {
    "Claim": 0.88,
    "Concept": 0.89,
    "Definition": 0.96,
    "Formula": 0.95,
    "Method": 0.9,
    "Section": 0.93,
    "Theorem": 0.95,
}
NODE_CONFIDENCE = {
    "Book": 0.99,
    "Concept": 0.89,
    "Fragment": 0.91,
    "LessonStep": 0.92,
    "SourceAsset": 0.97,
    **SEMANTIC_NODE_CONFIDENCE,
}
EDGE_CONFIDENCE = {
    "ABOUT": 0.9,
    "CONTAINS": 0.96,
    "DEFINES": 0.95,
    "DERIVED_FROM": 0.99,
    "EVIDENCE_FOR": 0.94,
    "EXAMPLE_OF": 0.88,
    "MENTIONS": 0.88,
    "NEXT_STEP": 0.94,
    "PREREQUISITE_OF": 0.9,
    "PROVES": 0.93,
    "RELATED_TO": 0.86,
    "SUPPORTS": 0.9,
    "TEACHES": 0.93,
    "TESTS": 0.92,
    "USES": 0.88,
}
SEMANTIC_RELATION_BY_TYPE = {
    "Claim": "SUPPORTS",
    "Definition": "DEFINES",
    "Formula": "ABOUT",
    "Method": "USES",
    "Theorem": "PROVES",
}


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
    return " ".join(str(value or "").strip().lower().split())


def _matches_keyword(text: str, keywords: list[str]) -> bool:
    normalized = _normalize_text(text)
    return any(keyword and _normalize_text(keyword) in normalized for keyword in keywords)


def _slugify_graph_id(value: Any, *, fallback: str) -> str:
    normalized = GRAPH_ID_SANITIZER.sub("-", str(value or "").strip().lower()).strip("-")
    return normalized or fallback


def _fragment_metadata(fragment: dict[str, Any]) -> dict[str, Any]:
    metadata = fragment.get("metadata")
    if isinstance(metadata, dict):
        return metadata
    metadata = fragment.get("metadata_json")
    if isinstance(metadata, dict):
        return metadata
    return {}


def _fragment_citation_anchor(fragment: dict[str, Any]) -> dict[str, Any]:
    anchor = fragment.get("citationAnchor")
    if isinstance(anchor, dict):
        return anchor
    anchor = fragment.get("citation_anchor_json")
    if isinstance(anchor, dict):
        return anchor
    return {}


def _fragment_provenance(fragment: dict[str, Any], *, section_id: str | None = None) -> dict[str, Any]:
    metadata = _fragment_metadata(fragment)
    anchor = _fragment_citation_anchor(fragment)
    resolved_section_id = (
        section_id
        or metadata.get("sectionId")
        or anchor.get("sectionId")
        or f"section:{fragment.get('assetId')}:{_slugify_graph_id(metadata.get('sectionTitle') or fragment.get('chapterLabel') or 'section', fallback='section')}"
    )
    return {
        "assetId": fragment.get("assetId"),
        "fragmentId": fragment.get("fragmentId") or fragment.get("id"),
        "offsetEnd": metadata.get("offsetEnd") or anchor.get("offsetEnd"),
        "offsetStart": metadata.get("offsetStart") or anchor.get("offsetStart"),
        "sectionId": resolved_section_id,
        "sentenceSpans": metadata.get("sentenceSpans") or [],
    }


def _default_provenance(*, profile_id: int, asset_id: int | None = None) -> dict[str, Any]:
    provenance: dict[str, Any] = {"profileId": profile_id}
    if asset_id is not None:
        provenance["assetId"] = asset_id
    return provenance


def _node_confidence(node_type: str) -> float:
    return float(NODE_CONFIDENCE.get(node_type, 0.9))


def _edge_confidence(edge_type: str) -> float:
    return float(EDGE_CONFIDENCE.get(edge_type, 0.86))


def _build_graph_node(
    *,
    node_id: str,
    node_type: str,
    label: str,
    profile_id: int,
    confidence: float | None = None,
    extractor: str | None = None,
    provenance: dict[str, Any] | None = None,
    **props: Any,
) -> dict[str, Any]:
    return {
        "id": node_id,
        "type": node_type,
        "label": label,
        "profileId": profile_id,
        "schemaVersion": GRAPH_SCHEMA_VERSION,
        "confidence": confidence if confidence is not None else _node_confidence(node_type),
        "extractor": extractor or GRAPH_EXTRACTOR,
        "provenance": provenance or _default_provenance(profile_id=profile_id),
        **props,
    }


def _append_edge(
    edges: list[dict[str, Any]],
    seen: set[tuple[str, str, str]],
    *,
    source: str,
    target: str,
    edge_type: str,
    extractor: str | None = None,
    provenance: dict[str, Any] | None = None,
    confidence: float | None = None,
    **props: Any,
) -> None:
    key = (source, target, edge_type)
    if key in seen:
        return
    seen.add(key)
    edges.append(
        {
            "source": source,
            "target": target,
            "type": edge_type,
            "schemaVersion": GRAPH_SCHEMA_VERSION,
            "confidence": confidence if confidence is not None else _edge_confidence(edge_type),
            "extractor": extractor or GRAPH_EXTRACTOR,
            "provenance": provenance or {},
            **props,
        }
    )


def _build_fragment_node(profile_id: int, fragment: dict[str, Any], *, section_id: str) -> dict[str, Any]:
    provenance = _fragment_provenance(fragment, section_id=section_id)
    metadata = _fragment_metadata(fragment)
    return _build_graph_node(
        node_id=f"fragment:{fragment['id']}",
        node_type="Fragment",
        label=fragment.get("semanticSummary") or f"片段 {int(fragment.get('chunkIndex') or 0) + 1}",
        profile_id=profile_id,
        assetId=fragment.get("assetId"),
        chapterLabel=fragment.get("chapterLabel"),
        chunkIndex=fragment.get("chunkIndex"),
        fragmentId=fragment.get("fragmentId") or fragment.get("id"),
        fragmentType=fragment.get("fragmentType") or metadata.get("blockType") or "text",
        sectionId=section_id,
        semanticSummary=fragment.get("semanticSummary"),
        confidence=0.91,
        extractor=metadata.get("sourceExtractor") or GRAPH_EXTRACTOR,
        provenance=provenance,
    )


def _content_for_matching(fragment: dict[str, Any]) -> str:
    metadata = _fragment_metadata(fragment)
    return " ".join(
        [
            str(metadata.get("sectionTitle") or ""),
            str(fragment.get("chapterLabel") or ""),
            str(fragment.get("semanticSummary") or ""),
            str(fragment.get("content") or ""),
        ]
    )


def _resolve_section_identity(fragment: dict[str, Any], *, asset_id: int) -> tuple[str, str, int]:
    metadata = _fragment_metadata(fragment)
    section_title = str(metadata.get("sectionTitle") or fragment.get("chapterLabel") or f"资料 {asset_id} 章节").strip()
    section_slug = str(
        metadata.get("sectionSlug") or _slugify_graph_id(section_title, fallback=f"asset-{asset_id}-section")
    )
    section_id = str(metadata.get("sectionId") or f"section:{asset_id}:{section_slug}")
    section_level = int(metadata.get("sectionLevel") or 1)
    return section_id, section_title, section_level


def _extract_semantic_types(fragment: dict[str, Any]) -> list[str]:
    metadata = _fragment_metadata(fragment)
    content = str(fragment.get("content") or "")
    block_type = str(metadata.get("blockType") or "").strip().lower()
    if block_type == "definition":
        return ["Definition"]
    if block_type == "theorem":
        return ["Theorem"]
    if block_type == "formula":
        return ["Formula"]
    if block_type == "method":
        return ["Method"]
    if block_type == "claim":
        return ["Claim"]

    semantic_types: list[str] = []
    if METHOD_PATTERN.search(content):
        semantic_types.append("Method")
    if CLAIM_PATTERN.search(content):
        semantic_types.append("Claim")
    if FORMULA_PATTERN.search(content):
        semantic_types.append("Formula")
    return semantic_types


def _extract_formula_label(content: str) -> str:
    for line in content.splitlines():
        compact = line.strip()
        if compact and FORMULA_PATTERN.search(compact):
            return compact[:72]
    return content.strip()[:72]


def _extract_semantic_label(node_type: str, fragment: dict[str, Any]) -> str:
    summary = str(fragment.get("semanticSummary") or "").strip()
    content = str(fragment.get("content") or "").strip()
    if node_type == "Formula":
        return _extract_formula_label(content) or summary or "公式"
    if summary:
        return summary[:72]
    first_line = next((line.strip() for line in content.splitlines() if line.strip()), "")
    return first_line[:72] or node_type


def _build_semantic_nodes_for_fragment(
    *,
    profile_id: int,
    fragment: dict[str, Any],
    matched_concept_ids: list[str],
    section_id: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    semantic_nodes: list[dict[str, Any]] = []
    semantic_edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    metadata = _fragment_metadata(fragment)
    fragment_id = int(fragment["id"])
    semantic_types = _extract_semantic_types(fragment)
    provenance = _fragment_provenance(fragment, section_id=section_id)

    for node_type in semantic_types:
        label = _extract_semantic_label(node_type, fragment)
        semantic_node_id = f"{node_type.lower()}:{fragment_id}:{_slugify_graph_id(label, fallback=str(fragment_id))}"
        semantic_nodes.append(
            _build_graph_node(
                node_id=semantic_node_id,
                node_type=node_type,
                label=label,
                profile_id=profile_id,
                confidence=SEMANTIC_NODE_CONFIDENCE[node_type],
                extractor=metadata.get("sourceExtractor") or GRAPH_EXTRACTOR,
                provenance=provenance,
                assetId=fragment.get("assetId"),
                sectionId=section_id,
            )
        )
        _append_edge(
            semantic_edges,
            seen,
            source=f"fragment:{fragment_id}",
            target=semantic_node_id,
            edge_type="EVIDENCE_FOR",
            provenance=provenance,
        )
        relation_type = SEMANTIC_RELATION_BY_TYPE.get(node_type)
        if relation_type is None:
            continue
        for concept_id in matched_concept_ids[:4]:
            _append_edge(
                semantic_edges,
                seen,
                source=semantic_node_id,
                target=concept_id,
                edge_type=relation_type,
                provenance=provenance,
            )

    return semantic_nodes, semantic_edges


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
        _build_graph_node(
            node_id="book:profile",
            node_type="Book",
            label=profile_title,
            profile_id=profile_id,
            bookId=profile_id,
            provenance=_default_provenance(profile_id=profile_id),
        )
    ]
    edges: list[dict[str, Any]] = []
    edge_keys: set[tuple[str, str, str]] = set()

    concept_nodes: dict[str, dict[str, Any]] = {}
    section_nodes: dict[str, dict[str, Any]] = {}
    asset_nodes: dict[int, str] = {}
    semantic_node_ids: set[str] = set()

    def ensure_concept_node(concept_label: str, *, provenance: dict[str, Any] | None = None) -> str:
        concept = str(concept_label or "").strip()
        concept_id = f"concept:{concept}"
        if not concept or concept_id in concept_nodes:
            return concept_id
        concept_node = _build_graph_node(
            node_id=concept_id,
            node_type="Concept",
            label=concept,
            profile_id=profile_id,
            concept=concept,
            confidence=NODE_CONFIDENCE["Concept"],
            provenance=provenance or _default_provenance(profile_id=profile_id),
        )
        concept_nodes[concept_id] = concept_node
        nodes.append(concept_node)
        return concept_id

    for concept in concepts[:48]:
        ensure_concept_node(str(concept), provenance=_default_provenance(profile_id=profile_id))

    for asset in assets:
        asset_id = int(asset["id"])
        asset_node_id = f"asset:{asset_id}"
        asset_nodes[asset_id] = asset_node_id
        asset_node = _build_graph_node(
            node_id=asset_node_id,
            node_type="SourceAsset",
            label=asset.get("fileName") or asset.get("assetKind") or f"资料 {asset_id}",
            profile_id=profile_id,
            assetId=asset_id,
            assetKind=asset.get("assetKind"),
            fileName=asset.get("fileName"),
            provenance=_default_provenance(profile_id=profile_id, asset_id=asset_id),
        )
        nodes.append(asset_node)
        _append_edge(
            edges,
            edge_keys,
            source=asset_node_id,
            target="book:profile",
            edge_type="DERIVED_FROM",
            provenance=_default_provenance(profile_id=profile_id, asset_id=asset_id),
        )

    for fragment in fragments[:256]:
        asset_id = int(fragment["assetId"])
        section_id, section_title, section_level = _resolve_section_identity(fragment, asset_id=asset_id)
        section_provenance = _fragment_provenance(fragment, section_id=section_id)
        if section_id not in section_nodes:
            section_node = _build_graph_node(
                node_id=section_id,
                node_type="Section",
                label=section_title,
                profile_id=profile_id,
                assetId=asset_id,
                sectionId=section_id,
                sectionLevel=section_level,
                confidence=SEMANTIC_NODE_CONFIDENCE["Section"],
                provenance=section_provenance,
            )
            section_nodes[section_id] = section_node
            nodes.append(section_node)
        _append_edge(
            edges,
            edge_keys,
            source=asset_nodes.get(asset_id, "book:profile"),
            target=section_id,
            edge_type="CONTAINS",
            provenance=section_provenance,
        )

        fragment_node = _build_fragment_node(profile_id, fragment, section_id=section_id)
        nodes.append(fragment_node)
        _append_edge(
            edges,
            edge_keys,
            source=fragment_node["id"],
            target=asset_nodes.get(asset_id, "book:profile"),
            edge_type="DERIVED_FROM",
            provenance=fragment_node["provenance"],
        )
        _append_edge(
            edges,
            edge_keys,
            source=section_id,
            target=fragment_node["id"],
            edge_type="CONTAINS",
            provenance=fragment_node["provenance"],
        )

        content_text = _content_for_matching(fragment)
        matched_concepts = [
            concept_id
            for concept_id, concept_node in concept_nodes.items()
            if _matches_keyword(content_text, [concept_node["label"]])
        ]
        for concept_id in matched_concepts[:6]:
            _append_edge(
                edges,
                edge_keys,
                source=fragment_node["id"],
                target=concept_id,
                edge_type="MENTIONS",
                provenance=fragment_node["provenance"],
            )

        semantic_nodes, semantic_edges = _build_semantic_nodes_for_fragment(
            profile_id=profile_id,
            fragment=fragment,
            matched_concept_ids=matched_concepts,
            section_id=section_id,
        )
        for node in semantic_nodes:
            if node["id"] in semantic_node_ids:
                continue
            semantic_node_ids.add(node["id"])
            nodes.append(node)
        for edge in semantic_edges:
            _append_edge(
                edges,
                edge_keys,
                source=edge["source"],
                target=edge["target"],
                edge_type=edge["type"],
                extractor=edge.get("extractor"),
                provenance=edge.get("provenance"),
                confidence=edge.get("confidence"),
            )

    for step in steps or []:
        step_id = f"step:{step['step_index']}"
        step_keywords = list(step.get("keywords_json") or [])
        step_node = _build_graph_node(
            node_id=step_id,
            node_type="LessonStep",
            label=step["title"],
            profile_id=profile_id,
            stepIndex=step["step_index"],
            title=step["title"],
            objective=step.get("objective"),
            guidingQuestion=step.get("guiding_question"),
            keywords=step_keywords,
            provenance=_default_provenance(profile_id=profile_id),
        )
        nodes.append(step_node)
        _append_edge(
            edges,
            edge_keys,
            source=step_id,
            target="book:profile",
            edge_type="TEACHES",
            provenance=_default_provenance(profile_id=profile_id),
        )
        for keyword in step_keywords[:6]:
            concept_id = ensure_concept_node(
                keyword,
                provenance={"profileId": profile_id, "source": "step_keywords"},
            )
            _append_edge(
                edges,
                edge_keys,
                source=step_id,
                target=concept_id,
                edge_type="TESTS",
                provenance={"profileId": profile_id, "stepIndex": step["step_index"]},
            )

    for left, right in zip((steps or [])[:-1], (steps or [])[1:]):
        _append_edge(
            edges,
            edge_keys,
            source=f"step:{left['step_index']}",
            target=f"step:{right['step_index']}",
            edge_type="NEXT_STEP",
            provenance={"profileId": profile_id},
        )

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
                    concept_id = ensure_concept_node(keyword)
                    _append_edge(
                        edges,
                        edge_keys,
                        source=concept_id,
                        target=concept_id,
                        edge_type="PREREQUISITE_OF",
                        provenance={"profileId": profile_id, "stepIndex": right["step_index"]},
                    )

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
    return _serialize_neo4j_props(props)


def _edge_props(edge: dict[str, Any], *, profile_id: int) -> dict[str, Any]:
    props = {key: value for key, value in edge.items() if key not in {"source", "target", "type"}}
    props["profile_id"] = profile_id
    return _serialize_neo4j_props(props)


def _is_neo4j_primitive(value: Any) -> bool:
    return value is None or isinstance(value, (bool, float, int, str))


def _serialize_neo4j_prop_value(value: Any) -> Any:
    if _is_neo4j_primitive(value):
        return value
    if isinstance(value, list):
        if all(_is_neo4j_primitive(item) for item in value):
            return value
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    return json.dumps(value, ensure_ascii=False)


def _serialize_neo4j_props(props: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize_neo4j_prop_value(value) for key, value in props.items()}


def _deserialize_neo4j_prop(key: str, value: Any) -> Any:
    if key != "provenance" or not isinstance(value, str):
        return value
    try:
        decoded = json.loads(value)
    except json.JSONDecodeError:
        return value
    return decoded if isinstance(decoded, dict) else value


def _deserialize_neo4j_props(props: dict[str, Any]) -> dict[str, Any]:
    return {key: _deserialize_neo4j_prop(key, value) for key, value in props.items()}


def _coerce_node(props: dict[str, Any], labels: list[str]) -> dict[str, Any]:
    node = _deserialize_neo4j_props(dict(props))
    node["type"] = next((label for label in labels if label != "LearningNode"), labels[0] if labels else "Node")
    node.pop("profile_id", None)
    return node


def _coerce_edge(source: str, target: str, edge_type: str, props: dict[str, Any] | None) -> dict[str, Any]:
    edge = _deserialize_neo4j_props(dict(props or {}))
    edge.pop("profile_id", None)
    edge.update({"source": source, "target": target, "type": edge_type})
    return edge


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
                        f"MERGE (a)-[r:{rel_type} {{profile_id: $profile_id}}]->(b) "
                        f"SET r += $props",
                        source=edge["source"],
                        target=edge["target"],
                        profile_id=profile_id,
                        props=_edge_props(edge, profile_id=profile_id),
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
                    "RETURN a.id AS source, b.id AS target, type(r) AS type, properties(r) AS props",
                    profile_id=profile_id,
                )
                edges = [
                    _coerce_edge(row["source"], row["target"], row["type"], dict(row.get("props") or {}))
                    for row in edge_rows
                ]
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
