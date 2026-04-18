from __future__ import annotations

import sys
import zipfile
from io import BytesIO
from types import SimpleNamespace

from app.core.config import Settings

from app.learning.graph import LearningGraphService
from app.learning.llm_flow import LearningLLMWorkflow
from app.learning.mineru import MinerUClient
from app.learning.orchestrator import ExploreOrchestrator, GuideOrchestrator
from app.learning.retrieval import LearningRetrievalService
from app.learning.service import LearningService


class FakeLLMProvider:
    def __init__(self, reply: str) -> None:
        self.reply = reply
        self.calls: list[dict] = []

    def chat(self, *, text: str, context: dict) -> str:
        self.calls.append({"text": text, "context": context})
        return self.reply


class FakeMinerUClient:
    def __init__(self, *, enabled: bool, md_content: str | None = None, error: Exception | None = None) -> None:
        self.enabled = enabled
        self.md_content = md_content
        self.error = error
        self.calls: list[str] = []

    def is_enabled(self) -> bool:
        return self.enabled

    def parse_path(self, file_path: str, *, backend: str = "pipeline") -> dict:
        del backend
        self.calls.append(file_path)
        if self.error is not None:
            raise self.error
        return {"md_content": self.md_content}


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


def test_learning_llm_workflow_explore_answer_recovers_json_from_fenced_reply(monkeypatch):
    provider = FakeLLMProvider(
        """
        下面是结果：
        ```json
        {
          "answer": "这份资料的重点是先判断候选人的翻译方向、行业经验和项目证据是否匹配岗位。",
          "relatedConcepts": ["岗位匹配", "项目证据"]
        }
        ```
        """
    )
    monkeypatch.setattr("app.learning.llm_flow.build_llm_provider", lambda: provider)

    workflow = LearningLLMWorkflow()
    result = workflow.explore_answer(
        focus_context={},
        citations=[],
        user_content="这份简历最值得先看什么？",
    )

    assert result == {
        "answer": "这份资料的重点是先判断候选人的翻译方向、行业经验和项目证据是否匹配岗位。",
        "relatedConcepts": ["岗位匹配", "项目证据"],
    }


def test_learning_llm_workflow_explore_answer_uses_raw_text_when_provider_returns_non_json(monkeypatch):
    provider = FakeLLMProvider("先看候选人的语言方向、行业场景和可验证项目，再决定是否继续深问。")
    monkeypatch.setattr("app.learning.llm_flow.build_llm_provider", lambda: provider)

    workflow = LearningLLMWorkflow()
    result = workflow.explore_answer(
        focus_context={},
        citations=[],
        user_content="这份简历先看什么？",
    )

    assert result == {
        "answer": "先看候选人的语言方向、行业场景和可验证项目，再决定是否继续深问。",
        "relatedConcepts": [],
    }


def test_learning_service_prefers_mineru_for_pdf_when_enabled(tmp_path, monkeypatch):
    pdf_path = tmp_path / "resume.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 fake")

    class UnexpectedPdfReader:
        def __init__(self, *args, **kwargs):
            raise AssertionError("PdfReader should not run before MinerU for PDF extraction")

    monkeypatch.setitem(sys.modules, "pypdf", SimpleNamespace(PdfReader=UnexpectedPdfReader))

    service = LearningService(settings=Settings(learning_storage_dir=str(tmp_path), _env_file=None))
    service.mineru_client = FakeMinerUClient(enabled=True, md_content="# MinerU PDF\n\nParsed first.")

    result = service._extract_text_from_blob(
        storage_path=str(pdf_path),
        file_name=pdf_path.name,
        mime_type="application/pdf",
    )

    assert result == "# MinerU PDF\n\nParsed first."
    assert service.mineru_client.calls == [str(pdf_path)]


def test_learning_service_falls_back_to_pypdf_after_mineru_pdf_failure(tmp_path, monkeypatch):
    pdf_path = tmp_path / "resume.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 fake")
    pypdf_calls: list[str] = []

    class FakePdfReader:
        def __init__(self, path: str):
            pypdf_calls.append(path)
            self.pages = [SimpleNamespace(extract_text=lambda: "Recovered by pypdf after MinerU failure.")]

    monkeypatch.setitem(sys.modules, "pypdf", SimpleNamespace(PdfReader=FakePdfReader))

    service = LearningService(settings=Settings(learning_storage_dir=str(tmp_path), _env_file=None))
    service.mineru_client = FakeMinerUClient(enabled=True, error=RuntimeError("mineru unavailable"))

    result = service._extract_text_from_blob(
        storage_path=str(pdf_path),
        file_name=pdf_path.name,
        mime_type="application/pdf",
    )

    assert result == "Recovered by pypdf after MinerU failure."
    assert service.mineru_client.calls == [str(pdf_path)]
    assert pypdf_calls == [str(pdf_path)]


def test_mineru_client_prefers_local_api_when_healthy_even_if_cloud_is_configured(tmp_path, monkeypatch):
    pdf_path = tmp_path / "resume.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 fake")
    calls: list[tuple[str, str]] = []

    class FakeResponse:
        def __init__(self, *, json_data=None, status_code: int = 200):
            self._json_data = json_data
            self.status_code = status_code

        def json(self):
            return self._json_data

        def raise_for_status(self):
            if self.status_code >= 400:
                raise RuntimeError(f"http {self.status_code}")

    class FakeHttpxClient:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def get(self, url, **kwargs):
            calls.append(("GET", url))
            if url == "http://127.0.0.1:8001/health":
                return FakeResponse(json_data={"status": "ok"})
            raise AssertionError(f"Unexpected GET {url}")

        def post(self, url, *, data=None, files=None, **kwargs):
            calls.append(("POST", url))
            if url == "http://127.0.0.1:8001/file_parse":
                assert data["return_md"] == "true"
                assert data["backend"] == "pipeline"
                assert "files" in files
                return FakeResponse(
                    json_data={
                        "results": {
                            "resume.pdf": {
                                "md_content": "# Parsed by local MinerU",
                            }
                        }
                    }
                )
            raise AssertionError(f"Unexpected POST {url}")

    monkeypatch.setattr("app.learning.mineru.httpx.Client", lambda *args, **kwargs: FakeHttpxClient())

    client = MinerUClient(
        settings=Settings(
            mineru_local_base_url="http://127.0.0.1:8001",
            mineru_cloud_base_url="https://mineru.net",
            mineru_api_token="secret-token",
            _env_file=None,
        )
    )

    result = client.parse_path(str(pdf_path))

    assert result["md_content"] == "# Parsed by local MinerU"
    assert result["provider"] == "mineru-local"
    assert calls == [
        ("GET", "http://127.0.0.1:8001/health"),
        ("POST", "http://127.0.0.1:8001/file_parse"),
    ]


def test_mineru_client_falls_back_to_cloud_when_local_is_unavailable(tmp_path, monkeypatch):
    pdf_path = tmp_path / "resume.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 fake")
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as archive:
        archive.writestr("result/full.md", "# Parsed by cloud MinerU")
    zip_bytes = zip_buffer.getvalue()
    calls: list[tuple[str, str, dict | None, dict | None]] = []
    poll_count = {"value": 0}

    class FakeResponse:
        def __init__(self, *, json_data=None, content: bytes | None = None, status_code: int = 200):
            self._json_data = json_data
            self.content = content or b""
            self.status_code = status_code

        def json(self):
            if self._json_data is None:
                raise AssertionError("json() should not be called for binary responses")
            return self._json_data

        def raise_for_status(self):
            if self.status_code >= 400:
                raise RuntimeError(f"http {self.status_code}")

    class FakeHttpxClient:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def get(self, url, *, headers=None):
            calls.append(("GET", url, headers, None))
            if url == "http://127.0.0.1:8001/health":
                raise RuntimeError("local mineru is down")
            if url.endswith("/api/v4/extract-results/batch/batch-123"):
                poll_count["value"] += 1
                if poll_count["value"] == 1:
                    return FakeResponse(
                        json_data={
                            "code": 0,
                            "data": {"batch_id": "batch-123", "extract_result": [{"state": "running", "err_msg": ""}]},
                            "msg": "ok",
                        }
                    )
                return FakeResponse(
                    json_data={
                        "code": 0,
                        "data": {
                            "batch_id": "batch-123",
                            "extract_result": [
                                {"state": "done", "err_msg": "", "full_zip_url": "https://cdn.example/result.zip"}
                            ],
                        },
                        "msg": "ok",
                    }
                )
            if url == "https://cdn.example/result.zip":
                return FakeResponse(content=zip_bytes)
            raise AssertionError(f"Unexpected GET {url}")

        def post(self, url, *, headers=None, json=None):
            calls.append(("POST", url, headers, json))
            return FakeResponse(
                json_data={
                    "code": 0,
                    "data": {"batch_id": "batch-123", "file_urls": ["https://upload.example/file"]},
                    "msg": "ok",
                }
            )

        def put(self, url, *, data=None, headers=None):
            calls.append(("PUT", url, headers, {"size": len(data) if data is not None else 0}))
            return FakeResponse()

    monkeypatch.setattr("app.learning.mineru.httpx.Client", lambda *args, **kwargs: FakeHttpxClient())
    monkeypatch.setattr("app.learning.mineru.time.sleep", lambda seconds: None)

    client = MinerUClient(
        settings=Settings(
            mineru_local_base_url="http://127.0.0.1:8001",
            mineru_cloud_base_url="https://mineru.net",
            mineru_api_token="secret-token",
            mineru_model_version="vlm",
            mineru_poll_interval_seconds=0,
            mineru_max_wait_seconds=5,
            _env_file=None,
        )
    )

    result = client.parse_path(str(pdf_path))

    assert result["md_content"] == "# Parsed by cloud MinerU"
    assert calls[0] == (
        "GET",
        "http://127.0.0.1:8001/health",
        None,
        None,
    )
    assert calls[1] == (
        "POST",
        "https://mineru.net/api/v4/file-urls/batch",
        {"Authorization": "Bearer secret-token", "Content-Type": "application/json"},
        {
            "files": [{"name": "resume.pdf", "data_id": "resume.pdf"}],
            "model_version": "vlm",
            "enable_formula": True,
            "enable_table": True,
            "is_ocr": False,
        },
    )
    assert calls[2][0] == "PUT"
    assert calls[3][1] == "https://mineru.net/api/v4/extract-results/batch/batch-123"


def test_mineru_client_shortens_cloud_data_id_for_long_file_names(tmp_path):
    long_name = ("very-long-file-name-" * 10) + ".pdf"
    pdf_path = tmp_path / long_name
    pdf_path.write_bytes(b"%PDF-1.4 fake")

    client = MinerUClient(
        settings=Settings(
            mineru_cloud_base_url="https://mineru.net",
            mineru_api_token="secret-token",
            _env_file=None,
        )
    )
    data_id = client._build_cloud_data_id(pdf_path)

    assert len(data_id) <= 128
    assert data_id.endswith(".pdf")


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
