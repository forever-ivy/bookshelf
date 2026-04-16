from __future__ import annotations

from types import SimpleNamespace

from app.learning.graph import LearningGraphService
from app.learning.llm_flow import LearningLLMWorkflow
from app.learning.orchestrator import ExploreOrchestrator, GuideOrchestrator
from app.learning.retrieval import LearningRetrievalService


class FakeLLMProvider:
    def __init__(self, reply: str) -> None:
        self.reply = reply
        self.calls: list[dict] = []

    def chat(self, *, text: str, context: dict) -> str:
        self.calls.append({"text": text, "context": context})
        return self.reply


def test_learning_llm_workflow_plans_path_from_json(monkeypatch):
    provider = FakeLLMProvider(
        """
        {
          "summary": "先建立系统视角，再拆解关键概念。",
          "concepts": ["进程", "线程", "调度"],
          "steps": [
            {
              "step_index": 0,
              "step_type": "orientation",
              "title": "先看整体",
              "objective": "建立整体认知",
              "guiding_question": "这份资料在解决什么问题？",
              "success_criteria": "能概括主线",
              "prerequisite_step_ids": [],
              "keywords_json": ["进程", "线程"],
              "metadata_json": {"agent": "Planner"}
            }
          ]
        }
        """
    )
    monkeypatch.setattr("app.learning.llm_flow.build_llm_provider", lambda: provider)

    workflow = LearningLLMWorkflow()
    result = workflow.plan_path(
        title="操作系统实验导学",
        goal_mode="preview",
        difficulty_mode="guided",
        combined_text="进程和线程是并发控制的基础，调度决定执行顺序。",
    )

    assert result is not None
    assert result["summary"] == "先建立系统视角，再拆解关键概念。"
    assert result["concepts"] == ["进程", "线程", "调度"]
    assert result["steps"][0]["title"] == "先看整体"
    assert provider.calls[0]["context"]["goalMode"] == "preview"


def test_learning_retrieval_prefers_step_keywords(monkeypatch):
    service = LearningRetrievalService()
    service.embedding_provider = SimpleNamespace(embed_texts=lambda texts: [[0.0, 0.0] for _ in texts])
    fragments = [
        SimpleNamespace(
            id=1,
            asset_id=1,
            chunk_index=0,
            embedding=[0.0, 0.0],
            search_vector="并发 基础 理论",
            content_tsv="并发 基础 理论",
            content="并发基础理论",
            chapter_label="A",
            citation_anchor_json={},
        ),
        SimpleNamespace(
            id=2,
            asset_id=1,
            chunk_index=1,
            embedding=[0.0, 0.0],
            search_vector="线程 切换 开销 实验",
            content_tsv="线程 切换 开销 实验",
            content="线程切换开销实验",
            chapter_label="B",
            citation_anchor_json={},
        ),
    ]
    monkeypatch.setattr("app.learning.retrieval.repository.list_profile_fragments", lambda session, profile_id: fragments)
    monkeypatch.setattr(
        "app.learning.retrieval.repository.list_profile_fragments_by_ids",
        lambda session, profile_id, fragment_ids: [fragment for fragment in fragments if fragment.id in set(fragment_ids)],
    )

    result = service.hybrid_search(
        None,
        profile_id=1,
        query="实验里怎么观察开销",
        top_k=2,
        preferred_keywords=["线程", "切换"],
    )

    assert [item.fragment_id for item in result] == [2, 1]


def test_learning_graph_service_persists_and_reads_neo4j_snapshot(monkeypatch):
    graph_state = {"nodes": {}, "edges": []}

    class FakeResult:
        def __init__(self, rows=None):
            self.rows = rows or []

        def consume(self):
            return None

        def __iter__(self):
            return iter(self.rows)

    class FakeSession:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def run(self, query, **params):
            if "DETACH DELETE" in query:
                graph_state["nodes"] = {
                    key: value for key, value in graph_state["nodes"].items() if value["props"]["profile_id"] != params["profile_id"]
                }
                graph_state["edges"] = []
                return FakeResult()
            if "MERGE (n:" in query:
                label = query.split("MERGE (n:", 1)[1].split(" ", 1)[0]
                graph_state["nodes"][params["id"]] = {
                    "labels": [label],
                    "props": params["props"],
                }
                return FakeResult()
            if "MERGE (a)-[r:" in query:
                rel_type = query.split("MERGE (a)-[r:", 1)[1].split(" ", 1)[0]
                graph_state["edges"].append(
                    {
                        "source": params["source"],
                        "target": params["target"],
                        "type": rel_type,
                        "profile_id": params["profile_id"],
                    }
                )
                return FakeResult()
            if "RETURN properties(n) AS props" in query:
                rows = [
                    {"props": node["props"], "labels": node["labels"]}
                    for node in graph_state["nodes"].values()
                    if node["props"]["profile_id"] == params["profile_id"]
                ]
                return FakeResult(rows)
            if "RETURN a.id AS source" in query:
                rows = [
                    {"source": edge["source"], "target": edge["target"], "type": edge["type"]}
                    for edge in graph_state["edges"]
                    if edge["profile_id"] == params["profile_id"]
                ]
                return FakeResult(rows)
            return FakeResult()

    class FakeDriver:
        def session(self, database=None):
            return FakeSession()

        def close(self):
            return None

    monkeypatch.setattr("app.learning.graph.GraphDatabase", SimpleNamespace(driver=lambda *args, **kwargs: FakeDriver()))

    settings = SimpleNamespace(
        graph_provider="neo4j",
        graph_uri="bolt://neo4j",
        graph_username="neo4j",
        graph_password="password",
        graph_database=None,
    )
    service = LearningGraphService(settings=settings)
    result = service.build_snapshot(
        profile_id=7,
        profile_title="操作系统实验导学",
        assets=[{"id": 1, "fileName": "os.md", "assetKind": "upload"}],
        fragments=[{"id": 11, "assetId": 1, "chunkIndex": 0, "semanticSummary": "线程切换", "profileId": 7}],
        concepts=["线程", "调度"],
        steps=[{"step_index": 0, "title": "先看整体", "keywords_json": ["线程"]}],
    )

    assert result.success is True
    assert result.provider == "neo4j"
    subgraph = service.get_profile_subgraph(profile_id=7)
    assert subgraph is not None
    assert any(node["type"] == "Concept" for node in subgraph["nodes"])
    assert any(edge["type"] == "MENTIONS" for edge in subgraph["edges"])
    step_candidates = service.list_step_fragment_candidates(profile_id=7, step_index=0, keywords=["线程"])
    assert [candidate.fragment_id for candidate in step_candidates] == [11]
    assert step_candidates[0].concepts == ["线程"]


def test_runtime_orchestrators_compile_langgraph_graphs():
    guide = GuideOrchestrator()
    explore = ExploreOrchestrator()

    assert guide.runtime is not None
    assert guide.runtime_node_names == [
        "load_session",
        "retrieve_evidence",
        "teacher_node",
        "peer_node",
        "examiner_node",
        "progress_node",
        "remediation_node",
        "persist_turn_and_report",
        "finalize",
    ]
    assert explore.runtime is not None
    assert explore.runtime_node_names == [
        "load_session",
        "retrieve_evidence",
        "answer_node",
        "related_concepts_node",
        "persist_turn_and_report",
        "finalize",
    ]


def test_learning_retrieval_service_guide_search_enforces_three_tier_order(monkeypatch):
    service = LearningRetrievalService()
    service.embedding_provider = SimpleNamespace(embed_texts=lambda texts: [[0.0, 0.0] for _ in texts])
    service.graph_service = SimpleNamespace(
        list_step_fragment_candidates=lambda **kwargs: [
            SimpleNamespace(fragment_id=2, concepts=["线程"], concept_hits=1, keyword_hits=1)
        ]
    )
    fragments = [
        SimpleNamespace(
            id=1,
            asset_id=10,
            chunk_index=0,
            embedding=[0.0, 0.0],
            search_vector="并发 基础 理论",
            content_tsv="并发 基础 理论",
            content="并发基础理论",
            chapter_label="A",
            citation_anchor_json={},
        ),
        SimpleNamespace(
            id=2,
            asset_id=10,
            chunk_index=1,
            embedding=[0.0, 0.0],
            search_vector="线程 切换 开销 实验",
            content_tsv="线程 切换 开销 实验",
            content="线程切换开销实验",
            chapter_label="B",
            citation_anchor_json={},
        ),
        SimpleNamespace(
            id=3,
            asset_id=10,
            chunk_index=2,
            embedding=[0.0, 0.0],
            search_vector="资源 隔离 进程 调度",
            content_tsv="资源 隔离 进程 调度",
            content="资源隔离与调度",
            chapter_label="C",
            citation_anchor_json={},
        ),
    ]
    monkeypatch.setattr("app.learning.retrieval.repository.list_profile_fragments", lambda session, profile_id: fragments)
    monkeypatch.setattr(
        "app.learning.retrieval.repository.list_profile_fragments_by_ids",
        lambda session, profile_id, fragment_ids: [fragment for fragment in fragments if fragment.id in set(fragment_ids)],
    )
    monkeypatch.setattr(
        "app.learning.retrieval.repository.list_step_context_items",
        lambda session, guide_session_id, step_index: [
            SimpleNamespace(
                id=88,
                content="桥接补充：实验角度要先比较线程切换和进程切换。",
                summary="桥接补充",
                source_session_id=90,
                source_turn_id=91,
            )
        ],
    )

    result = service.guide_search(
        None,
        profile_id=1,
        guide_session_id=33,
        step_index=0,
        query="线程切换实验怎么观察",
        top_k=4,
        preferred_keywords=["线程", "切换"],
    )

    assert result.citations[0]["citationAnchor"]["contextItemId"] == 88
    assert result.citations[1]["fragmentId"] == 2
    assert all(item["fragmentId"] != 2 for item in result.citations[2:] if item["fragmentId"] is not None)


def test_learning_retrieval_service_explore_search_prefers_focus_graph_candidates(monkeypatch):
    service = LearningRetrievalService()
    service.embedding_provider = SimpleNamespace(embed_texts=lambda texts: [[0.0, 0.0] for _ in texts])
    service.graph_service = SimpleNamespace(
        list_focus_fragment_candidates=lambda **kwargs: [
            SimpleNamespace(fragment_id=2, concepts=["线程"], concept_hits=1, keyword_hits=1)
        ]
    )
    fragments = [
        SimpleNamespace(
            id=1,
            asset_id=10,
            chunk_index=0,
            embedding=[0.0, 0.0],
            search_vector="并发 基础 理论",
            content_tsv="并发 基础 理论",
            content="并发基础理论",
            chapter_label="A",
            citation_anchor_json={},
        ),
        SimpleNamespace(
            id=2,
            asset_id=10,
            chunk_index=1,
            embedding=[0.0, 0.0],
            search_vector="线程 切换 开销 实验",
            content_tsv="线程 切换 开销 实验",
            content="线程切换开销实验",
            chapter_label="B",
            citation_anchor_json={},
        ),
    ]
    monkeypatch.setattr("app.learning.retrieval.repository.list_profile_fragments", lambda session, profile_id: fragments)
    monkeypatch.setattr(
        "app.learning.retrieval.repository.list_profile_fragments_by_ids",
        lambda session, profile_id, fragment_ids: [fragment for fragment in fragments if fragment.id in set(fragment_ids)],
    )
    monkeypatch.setattr(
        "app.learning.retrieval.repository.list_step_context_items",
        lambda session, guide_session_id, step_index: [
            SimpleNamespace(
                id=89,
                content="桥接补充：当前步骤强调线程切换的实验指标。",
                summary="桥接补充",
                source_session_id=90,
                source_turn_id=91,
            )
        ],
    )

    result = service.explore_search(
        None,
        profile_id=1,
        query="线程切换和进程切换差别是什么",
        top_k=4,
        focus_keywords=["线程", "切换"],
        source_session_id=33,
        focus_step_index=0,
    )

    assert result.citations[0]["citationAnchor"]["contextItemId"] == 89
    assert result.citations[1]["fragmentId"] == 2
