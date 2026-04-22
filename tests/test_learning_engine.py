from __future__ import annotations

import sys
import time
import zipfile
from io import BytesIO
from types import SimpleNamespace

import httpx
from openai import APITimeoutError

from app.core.config import Settings

from app.learning.graph import LearningGraphService
from app.learning.llm_flow import LearningLLMWorkflow
from app.learning.mineru import MinerUClient
from app.learning.orchestrator import (
    ExploreOrchestrator,
    GuideOrchestrator,
    _chunk_text_for_streaming,
)
from app.learning.retrieval import LearningRetrievalService
from app.learning.service import LearningService


class FakeLLMProvider:
    def __init__(self, reply: str, *, reasoning_content: str | None = None) -> None:
        self.reply = reply
        self.reasoning_content = reasoning_content
        self.calls: list[dict] = []

    def chat(self, *, text: str, context: dict) -> str:
        self.calls.append({"text": text, "context": context})
        return self.reply

    def chat_with_reasoning(self, *, text: str, context: dict) -> tuple[str, str | None]:
        self.calls.append({"text": text, "context": context, "mode": "reasoning"})
        return self.reply, self.reasoning_content


class SlowLLMProvider(FakeLLMProvider):
    def __init__(self, reply: str, *, delay_seconds: float, reasoning_content: str | None = None) -> None:
        super().__init__(reply, reasoning_content=reasoning_content)
        self.delay_seconds = delay_seconds

    def chat_with_reasoning(self, *, text: str, context: dict) -> tuple[str, str | None]:
        time.sleep(self.delay_seconds)
        return super().chat_with_reasoning(text=text, context=context)


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


def test_learning_service_plan_path_falls_back_when_llm_plan_times_out(tmp_path):
    service = LearningService(settings=Settings(learning_storage_dir=str(tmp_path), _env_file=None))

    def raise_timeout(**kwargs):
        raise APITimeoutError(request=httpx.Request("POST", "https://api.deepseek.com/chat/completions"))

    service.llm_workflow = SimpleNamespace(plan_path=raise_timeout)

    result = service._plan_learning_path(
        title="操作系统实验导学",
        goal_mode="preview",
        difficulty_mode="guided",
        combined_text="进程和线程是并发控制的基础，调度决定执行顺序。",
    )

    assert result["summary"]
    assert len(result["steps"]) >= 3
    assert result["steps"][0]["title"]


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
        "reasoningContent": None,
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
        "reasoningContent": None,
    }


def test_learning_llm_workflow_explore_answer_returns_reasoning_content(monkeypatch):
    provider = FakeLLMProvider(
        """
        {
          "answer": "先看候选人的语言方向和项目证据。",
          "relatedConcepts": ["岗位匹配"]
        }
        """,
        reasoning_content="先确定问题范围，再比对简历中的直接证据。",
    )
    monkeypatch.setattr("app.learning.llm_flow.build_llm_provider", lambda: provider)

    workflow = LearningLLMWorkflow()
    result = workflow.explore_answer(
        focus_context={},
        citations=[],
        user_content="这份简历先看什么？",
    )

    assert result == {
        "answer": "先看候选人的语言方向和项目证据。",
        "relatedConcepts": ["岗位匹配"],
        "reasoningContent": "先确定问题范围，再比对简历中的直接证据。",
    }


def test_learning_llm_workflow_explore_answer_returns_none_when_provider_exceeds_timeout(monkeypatch):
    provider = SlowLLMProvider(
        """
        {
          "answer": "先看候选人的语言方向和项目证据。",
          "relatedConcepts": ["岗位匹配"]
        }
        """,
        delay_seconds=0.2,
    )
    monkeypatch.setattr("app.learning.llm_flow.build_llm_provider", lambda: provider)

    workflow = LearningLLMWorkflow(settings=Settings(llm_timeout_seconds=0.01, _env_file=None))
    started_at = time.perf_counter()
    result = workflow.explore_answer(
        focus_context={},
        citations=[],
        user_content="这份简历先看什么？",
    )
    elapsed = time.perf_counter() - started_at

    assert result is None
    assert elapsed < 0.15


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


def test_learning_service_builds_structured_fragments_for_sections_and_formula_blocks(tmp_path):
    service = LearningService(
        settings=Settings(
            learning_storage_dir=str(tmp_path),
            learning_chunk_overlap=0,
            learning_chunk_size=120,
            _env_file=None,
        )
    )

    rows = service._build_fragments(
        """
        # 第一章 极限

        定义 1.1 函数极限是指当 x 趋于 a 时，f(x) 趋于 L。

        $$
        \\lim_{x \\to a} f(x) = L
        $$

        方法：使用 epsilon-delta 方法判断极限是否存在。
        """.strip()
    )

    assert [row["chapter_label"] for row in rows[:3]] == ["第一章 极限", "第一章 极限", "第一章 极限"]
    assert rows[0]["fragment_type"] == "definition"
    assert rows[0]["metadata_json"]["sectionTitle"] == "第一章 极限"
    assert rows[0]["metadata_json"]["blockType"] == "definition"
    assert rows[0]["metadata_json"]["sentenceSpans"][0]["text"].startswith("定义 1.1")
    assert rows[1]["fragment_type"] == "formula"
    assert rows[1]["metadata_json"]["blockType"] == "formula"
    assert rows[1]["citation_anchor_json"]["sectionId"].startswith("section:1:")
    assert rows[2]["fragment_type"] == "method"
    assert rows[2]["metadata_json"]["blockType"] == "method"
    assert rows[2]["metadata_json"]["offsetEnd"] > rows[2]["metadata_json"]["offsetStart"]


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

    def assert_neo4j_compatible(value):
        if isinstance(value, dict):
            raise TypeError("Neo4j properties do not support map values")
        if isinstance(value, list):
            for item in value:
                if isinstance(item, (dict, list)):
                    raise TypeError("Neo4j properties do not support nested collection values")
        return None

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
                for value in (params.get("props") or {}).values():
                    assert_neo4j_compatible(value)
                graph_state["nodes"][params["id"]] = {
                    "labels": [label],
                    "props": params["props"],
                }
                return FakeResult()
            if "MERGE (a)-[r:" in query:
                rel_type = query.split("MERGE (a)-[r:", 1)[1].split(" ", 1)[0]
                for value in (params.get("props") or {}).values():
                    assert_neo4j_compatible(value)
                graph_state["edges"].append(
                    {
                        "props": params.get("props") or {},
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
                    {
                        "props": edge.get("props") or {},
                        "source": edge["source"],
                        "target": edge["target"],
                        "type": edge["type"],
                    }
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
        fragments=[
            {
                "assetId": 1,
                "chapterLabel": "第一章 线程",
                "chunkIndex": 0,
                "content": "定义 1.1 线程是处理器调度的基本单位。",
                "id": 11,
                "metadata": {
                    "blockType": "definition",
                    "offsetEnd": 18,
                    "offsetStart": 0,
                    "sectionId": "section:1:thread",
                    "sectionLevel": 1,
                    "sectionSlug": "thread",
                    "sectionTitle": "第一章 线程",
                    "sentenceSpans": [
                        {
                            "index": 0,
                            "offsetEnd": 18,
                            "offsetStart": 0,
                            "text": "定义 1.1 线程是处理器调度的基本单位。",
                        }
                    ],
                },
                "profileId": 7,
                "semanticSummary": "线程定义",
            }
        ],
        concepts=["线程", "调度"],
        steps=[{"step_index": 0, "title": "先看整体", "keywords_json": ["线程"]}],
    )

    assert result.success is True
    assert result.provider == "neo4j"
    subgraph = service.get_profile_subgraph(profile_id=7)
    assert subgraph is not None
    assert any(node["type"] == "Concept" for node in subgraph["nodes"])
    assert any(node["type"] == "Section" for node in subgraph["nodes"])
    assert any(node["type"] == "Definition" for node in subgraph["nodes"])
    assert any(node.get("schemaVersion") == 2 for node in subgraph["nodes"])
    assert any(edge["type"] == "MENTIONS" for edge in subgraph["edges"])
    assert any(edge["type"] == "EVIDENCE_FOR" for edge in subgraph["edges"])
    assert any(edge["type"] == "DEFINES" for edge in subgraph["edges"])
    assert any(edge.get("provenance", {}).get("fragmentId") == 11 for edge in subgraph["edges"])
    step_candidates = service.list_step_fragment_candidates(profile_id=7, step_index=0, keywords=["线程"])
    assert [candidate.fragment_id for candidate in step_candidates] == [11]
    assert step_candidates[0].concepts == ["线程"]


def test_learning_graph_service_builds_structured_semantic_graph_metadata():
    service = LearningGraphService(
        settings=SimpleNamespace(
            graph_provider="disabled",
            graph_uri=None,
            graph_username=None,
            graph_password=None,
            graph_database=None,
        )
    )
    result = service.build_snapshot(
        profile_id=9,
        profile_title="微积分教材",
        assets=[{"id": 1, "fileName": "calculus.pdf", "assetKind": "upload"}],
        fragments=[
            {
                "assetId": 1,
                "chapterLabel": "第一章 极限",
                "chunkIndex": 0,
                "content": "定义 1.1 函数极限是指当 x 趋于 a 时，f(x) 趋于 L。",
                "id": 101,
                "metadata": {
                    "blockType": "definition",
                    "offsetEnd": 31,
                    "offsetStart": 0,
                    "sectionId": "section:1:limit",
                    "sectionLevel": 1,
                    "sectionSlug": "limit",
                    "sectionTitle": "第一章 极限",
                    "sentenceSpans": [
                        {
                            "index": 0,
                            "offsetEnd": 31,
                            "offsetStart": 0,
                            "text": "定义 1.1 函数极限是指当 x 趋于 a 时，f(x) 趋于 L。",
                        }
                    ],
                },
                "semanticSummary": "函数极限定义",
            },
            {
                "assetId": 1,
                "chapterLabel": "第一章 极限",
                "chunkIndex": 1,
                "content": "$$ \\lim_{x \\to a} f(x) = L $$",
                "id": 102,
                "metadata": {
                    "blockType": "formula",
                    "offsetEnd": 60,
                    "offsetStart": 32,
                    "sectionId": "section:1:limit",
                    "sectionLevel": 1,
                    "sectionSlug": "limit",
                    "sectionTitle": "第一章 极限",
                    "sentenceSpans": [
                        {
                            "index": 0,
                            "offsetEnd": 60,
                            "offsetStart": 32,
                            "text": "$$ \\lim_{x \\to a} f(x) = L $$",
                        }
                    ],
                },
                "semanticSummary": "极限公式",
            },
        ],
        concepts=["极限", "函数"],
        steps=[{"step_index": 0, "title": "理解极限", "keywords_json": ["极限"]}],
    )

    snapshot = result.snapshot
    assert result.provider == "fallback"
    assert any(node["type"] == "Section" for node in snapshot["nodes"])
    assert any(node["type"] == "Definition" for node in snapshot["nodes"])
    assert any(node["type"] == "Formula" for node in snapshot["nodes"])
    definition_node = next(node for node in snapshot["nodes"] if node["type"] == "Definition")
    assert definition_node["confidence"] >= 0.85
    assert definition_node["schemaVersion"] == 2
    assert definition_node["provenance"]["fragmentId"] == 101
    assert any(
        edge["type"] == "CONTAINS" and edge["source"] == "asset:1" and edge["target"].startswith("section:1:")
        for edge in snapshot["edges"]
    )
    assert any(
        edge["type"] == "EVIDENCE_FOR"
        and edge["source"] == "fragment:101"
        and edge["target"] == definition_node["id"]
        and edge["provenance"]["sectionId"].startswith("section:1:")
        for edge in snapshot["edges"]
    )
    assert any(
        edge["type"] == "DEFINES"
        and edge["source"] == definition_node["id"]
        and edge["target"] == "concept:极限"
        and edge["confidence"] >= 0.85
        for edge in snapshot["edges"]
    )
    assert any(
        edge["type"] == "MENTIONS"
        and edge["source"] == "fragment:101"
        and edge["target"] == "concept:极限"
        and edge["provenance"]["fragmentId"] == 101
        for edge in snapshot["edges"]
    )


def test_runtime_orchestrators_compile_langgraph_graphs():
    guide = GuideOrchestrator()
    explore = ExploreOrchestrator()

    assert guide.runtime is not None
    assert guide.runtime_node_names == [
        "load_session",
        "classify_intent",
        "control_node",
        "retrieve_evidence",
        "redirect_node",
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


def test_chunk_text_for_streaming_breaks_long_text_into_small_contiguous_chunks():
    text = "先确定问题范围，再比对资料证据，最后组织回答。"

    chunks = _chunk_text_for_streaming(text, chunk_size=6)

    assert "".join(chunks) == text
    assert len(chunks) > 1
    assert all(chunk for chunk in chunks)
    assert all(len(chunk) <= 6 for chunk in chunks)


def test_guide_teacher_node_emits_reasoning_and_writing_status_before_chunked_teacher_deltas():
    guide = GuideOrchestrator()
    guide.llm_workflow = SimpleNamespace(
        teacher_reply=lambda **kwargs: "先回到整体框架。再拆模型、数据和目标。"
    )

    state = {
        "citations": [],
        "current_step": {"title": "建立整体框架"},
        "events": [],
        "intent_kind": "step_answer",
        "learning_session": SimpleNamespace(id=301),
        "user_content": "帮我总结这一节的核心线索",
    }

    result = guide._teacher_node(state)

    public_events = [event for event in result["events"] if event["event"] != "agent.teacher.delta"]
    assert public_events[0] == {
        "data": {"phase": "reasoning", "sessionId": 301},
        "event": "status",
    }
    assert public_events[1] == {
        "data": {"phase": "writing", "sessionId": 301},
        "event": "status",
    }
    assert all(event["event"] == "teacher.delta" for event in public_events[2:])
    assert "".join(event["data"]["delta"] for event in public_events[2:]) == (
        "先回到整体框架。再拆模型、数据和目标。"
    )
    assert len(public_events[2:]) > 1


def test_explore_finalize_keeps_full_presentation_payload_on_assistant_final():
    explore = ExploreOrchestrator()
    final_payload = {
        "turn": {
            "assistantContent": "先看任务目标，再拆主要章节。",
            "id": 990,
            "presentation": {
                "answer": {"content": "先看任务目标，再拆主要章节。"},
                "bridgeActions": [{"actionType": "attach_explore_turn_to_guide_step", "label": "收编回 Guide"}],
                "evidence": [{"excerpt": "摘要片段", "sourceTitle": "test.pdf"}],
                "followups": ["继续展开第二段"],
                "kind": "explore",
                "reasoningContent": "先确定问题范围，再比对资料证据。",
                "relatedConcepts": ["任务分解"],
            },
            "sessionId": 901,
        }
    }

    state = explore._finalize({"events": [], "final_payload": final_payload})

    assert state["events"][-1] == {
        "data": final_payload,
        "event": "assistant.final",
    }


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
