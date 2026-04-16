from __future__ import annotations

import hashlib
import re
from datetime import timedelta
from pathlib import Path
from typing import Any, TypedDict

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.db.base import utc_now
from app.learning import repository
from app.learning.graph import LearningGraphService
from app.learning.llm_flow import LearningLLMWorkflow
from app.learning.mineru import MinerUClient
from app.learning.schemas import serialize_asset, serialize_fragment, serialize_path_step
from app.learning.storage import LearningBlobStore
from app.learning.web_fetch import UrlContentFetcher
from app.recommendation.embeddings import build_book_embedding_text, build_embedding_provider

try:
    from langgraph.graph import END, START, StateGraph  # type: ignore
except Exception:  # pragma: no cover - optional in tests
    END = "__end__"
    START = "__start__"
    StateGraph = None  # type: ignore[assignment]


FILENAME_SANITIZER = re.compile(r"[^A-Za-z0-9._-]+")
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]+")


class PlannerState(TypedDict, total=False):
    title: str
    goal_mode: str
    difficulty_mode: str
    combined_text: str
    concepts: list[str]
    summary: str
    steps: list[dict[str, Any]]


def _safe_filename(value: str | None, *, fallback: str) -> str:
    cleaned = FILENAME_SANITIZER.sub("-", (value or "").strip()).strip("-")
    return cleaned or fallback


def _tokenize_text(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_PATTERN.findall(text or "") if token]


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        normalized = item.strip().lower()
        if len(normalized) < 2 or normalized in seen:
            continue
        seen.add(normalized)
        result.append(item.strip())
    return result


def _chapter_label(index: int) -> str:
    return f"Section {index + 1}"


def learning_profile_storage_dir(*, settings: Settings, reader_id: int, profile_id: int) -> Path:
    root = Path(settings.learning_storage_dir).expanduser()
    return root / f"reader_{reader_id}" / f"profile_{profile_id}"


def ensure_learning_profile_storage_dir(*, settings: Settings, reader_id: int, profile_id: int) -> Path:
    target = learning_profile_storage_dir(settings=settings, reader_id=reader_id, profile_id=profile_id)
    target.mkdir(parents=True, exist_ok=True)
    return target


def chunk_text(text: str, *, chunk_size: int, overlap: int) -> list[str]:
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    if chunk_size <= overlap:
        overlap = max(0, chunk_size // 5)
    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        chunks.append(cleaned[start:end])
        if end >= len(cleaned):
            break
        start = max(end - overlap, start + 1)
    return chunks


def _token_string(text: str) -> str:
    return " ".join(token.lower() for token in TOKEN_PATTERN.findall(text or ""))


def _extract_candidate_concepts(text: str, *, limit: int = 8) -> list[str]:
    tokens = _tokenize_text(text)
    prioritized: list[str] = []
    for token in tokens:
        if token.isdigit():
            continue
        prioritized.append(token)
    return _dedupe(prioritized)[:limit]


def _summarize_text(title: str, text: str) -> str:
    compact = " ".join((text or "").split())
    compact = compact[:140]
    return f"{title}围绕以下主题展开：{compact}" if compact else f"{title}的导学资料已经准备完成。"


def _build_steps(state: PlannerState) -> PlannerState:
    concepts = state.get("concepts") or []
    goal_mode = state.get("goal_mode") or "preview"
    mode_hint = {
        "preview": "快速建立整体认知并抓住核心概念。",
        "sprint": "围绕高频考点快速建立应答模板。",
        "deep-dive": "细致理解概念之间的依赖关系和推导逻辑。",
        "lab": "把概念迁移到实验与实践操作场景中。",
    }.get(goal_mode, "建立结构化理解。")
    title = state.get("title") or "导学空间"
    steps = [
        {
            "step_index": 0,
            "step_type": "orientation",
            "title": "建立整体认知",
            "objective": f"概括《{title}》的核心主题，并明确学习目标。{mode_hint}",
            "guiding_question": "这份资料想先帮你建立什么整体认识？",
            "success_criteria": "能概括主题，并点出至少两个核心概念。",
            "prerequisite_step_ids": [],
            "keywords_json": concepts[:3],
            "metadata_json": {"agent": "Planner"},
        },
        {
            "step_index": 1,
            "step_type": "concept",
            "title": "拆解关键概念",
            "objective": "解释关键概念的含义，并说明它们之间如何关联。",
            "guiding_question": "如果把资料拆成几个关键概念，它们分别负责什么？",
            "success_criteria": "能解释两个以上关键概念，并说出它们之间的联系。",
            "prerequisite_step_ids": [0],
            "keywords_json": concepts[1:5] or concepts[:4],
            "metadata_json": {"agent": "Planner"},
        },
        {
            "step_index": 2,
            "step_type": "application",
            "title": "迁移到场景应用",
            "objective": "把资料中的方法迁移到实验、复习或解题场景中。",
            "guiding_question": "如果你现在要做实验或复习，你会先怎么应用这些概念？",
            "success_criteria": "能结合具体场景描述应用路径，并指出风险或注意点。",
            "prerequisite_step_ids": [1],
            "keywords_json": concepts[3:6] or concepts[:3],
            "metadata_json": {"agent": "Planner"},
        },
    ]
    if goal_mode in {"deep-dive", "lab"}:
        steps.append(
            {
                "step_index": 3,
                "step_type": "reflection",
                "title": "复盘与巩固",
                "objective": "梳理薄弱点并形成下一步补强计划。",
                "guiding_question": "你觉得最容易混淆的概念是什么，为什么？",
                "success_criteria": "能指出一个薄弱点，并提出具体补救动作。",
                "prerequisite_step_ids": [2],
                "keywords_json": concepts[5:8] or concepts[:3],
                "metadata_json": {"agent": "Planner"},
            }
        )
    state["steps"] = steps
    return state


def _build_summary(state: PlannerState) -> PlannerState:
    state["summary"] = _summarize_text(state.get("title") or "导学空间", state.get("combined_text") or "")
    return state


def _build_concepts(state: PlannerState) -> PlannerState:
    state["concepts"] = _extract_candidate_concepts(state.get("combined_text") or "")
    return state


def plan_learning_path(
    *,
    title: str,
    goal_mode: str,
    difficulty_mode: str,
    combined_text: str,
) -> dict[str, Any]:
    initial_state: PlannerState = {
        "title": title,
        "goal_mode": goal_mode,
        "difficulty_mode": difficulty_mode,
        "combined_text": combined_text,
    }
    if StateGraph is None:
        state = _build_summary(initial_state)
        state = _build_concepts(state)
        state = _build_steps(state)
        return {
            "summary": state["summary"],
            "concepts": state["concepts"],
            "steps": state["steps"],
        }

    graph = StateGraph(PlannerState)
    graph.add_node("summarize", _build_summary)
    graph.add_node("concepts", _build_concepts)
    graph.add_node("steps", _build_steps)
    graph.add_edge(START, "summarize")
    graph.add_edge("summarize", "concepts")
    graph.add_edge("concepts", "steps")
    graph.add_edge("steps", END)
    compiled = graph.compile()
    state = compiled.invoke(initial_state)
    return {
        "summary": state["summary"],
        "concepts": state["concepts"],
        "steps": state["steps"],
    }


class LearningService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.embedding_provider = build_embedding_provider(self.settings)
        self.graph_service = LearningGraphService(self.settings)
        self.llm_workflow = LearningLLMWorkflow(self.settings)
        self.blob_store = LearningBlobStore(self.settings)
        self.url_fetcher = UrlContentFetcher(self.settings)
        self.mineru_client = MinerUClient(self.settings)

    def create_upload(
        self,
        session: Session,
        *,
        reader_id: int,
        file_name: str,
        mime_type: str | None,
        raw_bytes: bytes,
    ):
        safe_name = _safe_filename(file_name, fallback="upload.bin")
        content_hash = hashlib.sha256(raw_bytes).hexdigest()
        storage_path = self.blob_store.write_bytes(
            key=f"uploads/reader_{reader_id}/{content_hash}/{safe_name}",
            data=raw_bytes,
            content_type=mime_type,
        )
        expires_at = utc_now() + timedelta(seconds=self.settings.learning_upload_ttl_seconds)
        return repository.create_upload(
            session,
            reader_id=reader_id,
            file_name=safe_name,
            mime_type=mime_type,
            storage_path=storage_path,
            content_hash=content_hash,
            expires_at=expires_at,
            metadata_json={"size": len(raw_bytes)},
        )

    def create_profile(
        self,
        session: Session,
        *,
        reader_id: int,
        title: str,
        goal_mode: str,
        difficulty_mode: str,
        sources: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if not sources:
            raise ApiError(400, "learning_sources_required", "At least one source is required")
        bundle = repository.create_source_bundle(
            session,
            reader_id=reader_id,
            title=title,
            metadata_json={"sourceKinds": [source.get("kind") for source in sources]},
        )
        profile = repository.create_profile(
            session,
            reader_id=reader_id,
            source_bundle_id=bundle.id,
            title=title,
            goal_mode=goal_mode,
            difficulty_mode=difficulty_mode,
            metadata_json={"sourceCount": len(sources)},
        )
        assets = [self._create_asset(session, reader_id=reader_id, profile_id=profile.id, bundle_id=bundle.id, source=source) for source in sources]
        jobs = [
            repository.create_job(session, profile_id=profile.id, job_type="parse"),
            repository.create_job(session, profile_id=profile.id, job_type="chunk"),
            repository.create_job(session, profile_id=profile.id, job_type="graph_build"),
            repository.create_job(session, profile_id=profile.id, job_type="plan_generate"),
        ]
        session.flush()
        return {"profile": profile, "source_bundle": bundle, "assets": assets, "jobs": jobs}

    def queue_generation(
        self,
        session: Session,
        *,
        reader_id: int,
        profile_id: int,
    ) -> dict[str, Any]:
        profile = repository.require_owned_profile(session, profile_id=profile_id, reader_id=reader_id)
        jobs = list(repository.list_profile_jobs(session, profile_id=profile.id))
        active_jobs = [job for job in jobs if job.status == "processing"]
        if active_jobs:
            return {"triggered": False, "jobs": jobs}

        for job in jobs:
            job.status = "processing"
            job.error_message = None
        profile.status = "queued"
        session.flush()

        if self.settings.learning_tasks_eager:
            session.commit()
            from app.learning.tasks import generate_learning_profile_task

            generate_learning_profile_task(profile.id, reader_id)
            session.expire_all()
            refreshed_jobs = list(repository.list_profile_jobs(session, profile_id=profile.id))
            return {"triggered": True, "jobs": refreshed_jobs}

        from app.learning.tasks import generate_learning_profile_task

        generate_learning_profile_task.delay(profile.id, reader_id)
        return {"triggered": True, "jobs": jobs}

    def _create_asset(
        self,
        session: Session,
        *,
        reader_id: int,
        profile_id: int,
        bundle_id: int,
        source: dict[str, Any],
    ):
        kind = str(source.get("kind") or "").strip()
        if kind == "book":
            book_id = source.get("bookId")
            if book_id is None:
                raise ApiError(400, "book_id_required", "Book source requires bookId")
            book = repository.require_book(session, book_id=int(book_id))
            book_source_document_id = source.get("bookSourceDocumentId")
            if book_source_document_id is None:
                primary = repository.get_primary_book_source_document(session, book_id=book.id)
                book_source_document_id = None if primary is None else primary.id
            return repository.create_source_asset(
                session,
                bundle_id=bundle_id,
                asset_kind="book",
                book_id=book.id,
                book_source_document_id=book_source_document_id,
                mime_type="text/markdown",
                file_name=f"book-{book.id}.md",
                metadata_json={"bookTitle": book.title, "sourceKind": "book"},
            )

        if kind == "inline_text":
            content = (source.get("content") or "").strip()
            if not content:
                raise ApiError(400, "inline_text_empty", "Inline text content is required")
            file_name = _safe_filename(source.get("fileName"), fallback="source.md")
            target = self.blob_store.write_text(
                key=f"profiles/reader_{reader_id}/profile_{profile_id}/uploads/{file_name}",
                text=content,
                content_type=source.get("mimeType") or "text/markdown",
            )
            return repository.create_source_asset(
                session,
                bundle_id=bundle_id,
                asset_kind="inline_text",
                mime_type=source.get("mimeType") or "text/markdown",
                file_name=file_name,
                storage_path=str(target),
                content_hash=hashlib.sha256(content.encode("utf-8")).hexdigest(),
                metadata_json={"sourceKind": "inline_text", "size": len(content)},
            )

        if kind == "upload":
            upload_id = source.get("uploadId")
            if upload_id is None:
                raise ApiError(400, "upload_id_required", "Upload source requires uploadId")
            upload = repository.require_owned_upload(session, upload_id=int(upload_id), reader_id=reader_id)
            upload.consumed_at = utc_now()
            return repository.create_source_asset(
                session,
                bundle_id=bundle_id,
                asset_kind="upload",
                mime_type=upload.mime_type,
                file_name=upload.file_name,
                storage_path=upload.storage_path,
                content_hash=upload.content_hash,
                metadata_json={"sourceKind": "upload", "uploadId": upload.id},
            )

        if kind == "url":
            url = str(source.get("url") or "").strip()
            if not url:
                raise ApiError(400, "learning_url_required", "URL source requires url")
            title = (source.get("title") or source.get("fileName") or "web-page").strip()
            return repository.create_source_asset(
                session,
                bundle_id=bundle_id,
                asset_kind="url",
                mime_type="text/html",
                file_name=_safe_filename(title, fallback="web-page") + ".html",
                storage_path=url,
                content_hash=hashlib.sha256(url.encode("utf-8")).hexdigest(),
                metadata_json={"sourceKind": "url", "title": title, "url": url},
            )

        raise ApiError(400, "unsupported_learning_source", f"Unsupported learning source kind: {kind}")

    def run_generation_pipeline(self, session: Session, *, reader_id: int, profile_id: int) -> dict[str, Any]:
        profile = repository.require_owned_profile(session, profile_id=profile_id, reader_id=reader_id)
        assets = list(repository.list_bundle_assets(session, bundle_id=profile.source_bundle_id))
        if not assets:
            raise ApiError(409, "learning_assets_missing", "Learning profile does not have any source assets")

        jobs = {job.job_type: job for job in repository.list_profile_jobs(session, profile_id=profile.id)}
        for job in jobs.values():
            job.attempt_count = int(job.attempt_count or 0) + 1
            if job.status == "queued":
                job.status = "processing"
        profile.status = "processing"
        session.flush()

        all_fragments: list[dict[str, Any]] = []
        combined_texts: list[str] = []
        parse_job = jobs.get("parse")
        chunk_job = jobs.get("chunk")
        graph_job = jobs.get("graph_build")
        plan_job = jobs.get("plan_generate")

        try:
            if parse_job is not None:
                parse_job.status = "processing"
            if chunk_job is not None:
                chunk_job.status = "processing"
            for asset in assets:
                asset_text = self._prepare_asset_text(session, profile=profile, asset=asset)
                combined_texts.append(asset_text)
                fragment_rows = repository.replace_asset_fragments(
                    session,
                    profile_id=profile.id,
                    asset_id=asset.id,
                    fragments=self._build_fragments(asset_text),
                )
                all_fragments.extend(serialize_fragment(fragment) for fragment in fragment_rows)
            if parse_job is not None:
                parse_job.status = "completed"
                parse_job.error_message = None
            if chunk_job is not None:
                chunk_job.status = "completed"
                chunk_job.error_message = None

            combined_text = "\n\n".join(combined_texts)
            planned = self._plan_learning_path(
                title=profile.title,
                goal_mode=profile.goal_mode,
                difficulty_mode=profile.difficulty_mode,
                combined_text=combined_text,
            )
            steps = planned["steps"]
            graph_result = self.graph_service.build_snapshot(
                profile_id=profile.id,
                profile_title=profile.title,
                assets=[serialize_asset(asset) for asset in assets],
                fragments=all_fragments,
                concepts=planned["concepts"],
                steps=steps,
            )
            if graph_job is not None:
                graph_job.status = "completed" if graph_result.success else "failed"
                graph_job.error_message = graph_result.error_message
            if plan_job is not None:
                plan_job.status = "processing"

            existing_versions = repository.list_profile_path_versions(session, profile_id=profile.id)
            path_version = repository.create_path_version(
                session,
                profile_id=profile.id,
                version_number=(existing_versions[0].version_number + 1 if existing_versions else 1),
                title=f"{profile.title}导学路径",
                overview=planned["summary"],
                graph_snapshot_json=graph_result.snapshot,
                graph_provider=graph_result.provider,
                metadata_json={"concepts": planned["concepts"]},
            )
            step_rows = repository.replace_path_steps(session, path_version_id=path_version.id, steps=steps)
            profile.active_path_version_id = path_version.id
            profile.status = "ready"
            profile.metadata_json = {
                **(profile.metadata_json or {}),
                "sourceSummary": planned["summary"],
                "concepts": planned["concepts"],
            }
            if plan_job is not None:
                plan_job.status = "completed"
                plan_job.error_message = None
            session.flush()
            return {
                "profile": profile,
                "assets": assets,
                "jobs": list(repository.list_profile_jobs(session, profile_id=profile.id)),
                "active_path_version": path_version,
                "steps": list(step_rows),
                "graph": graph_result.snapshot,
            }
        except Exception as exc:
            profile.status = "failed"
            for job in (parse_job, chunk_job, graph_job, plan_job):
                if job is not None and job.status == "processing":
                    job.status = "failed"
                    job.error_message = str(exc)
            session.flush()
            raise

    def _plan_learning_path(
        self,
        *,
        title: str,
        goal_mode: str,
        difficulty_mode: str,
        combined_text: str,
    ) -> dict[str, Any]:
        llm_plan = self.llm_workflow.plan_path(
            title=title,
            goal_mode=goal_mode,
            difficulty_mode=difficulty_mode,
            combined_text=combined_text,
        )
        if llm_plan is not None:
            return llm_plan
        return plan_learning_path(
            title=title,
            goal_mode=goal_mode,
            difficulty_mode=difficulty_mode,
            combined_text=combined_text,
        )

    def _prepare_asset_text(self, session: Session, *, profile, asset) -> str:
        if asset.asset_kind == "book":
            if asset.book_id is None:
                raise RuntimeError("Book asset is missing book_id")
            book = repository.require_book(session, book_id=asset.book_id)
            if asset.book_source_document_id is not None:
                source_document = repository.require_book_source_document(
                    session,
                    document_id=asset.book_source_document_id,
                )
                text = self._extract_text_from_book_source_document(source_document)
            else:
                text = self._build_book_source_text(book)
            self._persist_asset_text(profile=profile, asset=asset, text=text)
            asset.parse_status = "parsed"
            asset.metadata_json = {
                **(asset.metadata_json or {}),
                "bookTitle": book.title,
                "sourceSummary": _summarize_text(book.title, text),
            }
            if not asset.content_hash:
                asset.content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            return text

        if asset.asset_kind == "inline_text":
            if not asset.storage_path:
                raise RuntimeError("Inline text asset is missing storage_path")
            text = self.blob_store.read_text(asset.storage_path)
            self._persist_asset_text(profile=profile, asset=asset, text=text)
            asset.parse_status = "parsed"
            return text

        if asset.asset_kind == "upload":
            if not asset.storage_path:
                raise RuntimeError("Upload asset is missing storage_path")
            text = self._extract_text_from_blob(
                storage_path=asset.storage_path,
                file_name=asset.file_name,
                mime_type=asset.mime_type,
            )
            self._persist_asset_text(profile=profile, asset=asset, text=text)
            asset.parse_status = "parsed"
            return text

        if asset.asset_kind == "url":
            url = asset.storage_path or (asset.metadata_json or {}).get("url")
            if not url:
                raise RuntimeError("URL asset is missing source URL")
            fetched = self.url_fetcher.fetch(url)
            title = ((asset.metadata_json or {}).get("title") or fetched.get("title") or asset.file_name or "网页资料").strip()
            text = "\n".join(
                [
                    f"# {title}",
                    "",
                    fetched["content"],
                ]
            ).strip()
            self._persist_asset_text(profile=profile, asset=asset, text=text)
            asset.metadata_json = {
                **(asset.metadata_json or {}),
                "title": title,
                "finalUrl": fetched["url"],
                "sourceMimeType": fetched["mime_type"],
            }
            asset.parse_status = "parsed"
            return text

        raise RuntimeError(f"Unsupported asset kind: {asset.asset_kind}")

    def _persist_asset_text(self, *, profile, asset, text: str) -> None:
        target = self.blob_store.write_text(
            key=f"profiles/reader_{profile.reader_id}/profile_{profile.id}/sources/extracted_{asset.id}.md",
            text=text,
            content_type="text/markdown",
        )
        asset.extracted_text_path = str(target)

    def _build_book_source_text(self, book) -> str:
        return "\n".join(
            [
                f"# {book.title}",
                "",
                build_book_embedding_text(
                    title=book.title,
                    author=book.author,
                    category=book.category,
                    keywords=book.keywords,
                    summary=book.summary,
                ),
            ]
        )

    def _extract_text_from_book_source_document(self, source_document) -> str:
        if source_document.extracted_text_path:
            return self.blob_store.read_text(source_document.extracted_text_path)
        if source_document.storage_path:
            return self._extract_text_from_blob(
                storage_path=source_document.storage_path,
                file_name=source_document.file_name,
                mime_type=source_document.mime_type,
            )
        raise RuntimeError("Book source document does not have readable extracted text")

    def _extract_text_from_blob(
        self,
        *,
        storage_path: str,
        file_name: str | None,
        mime_type: str | None,
    ) -> str:
        suffix = Path(file_name or storage_path).suffix.lower()
        if suffix in {".md", ".markdown", ".txt"}:
            return self.blob_store.read_text(storage_path)
        if suffix in {".html", ".htm"}:
            html = self.blob_store.read_text(storage_path)
            return html
        if suffix == ".pdf":
            try:
                from pypdf import PdfReader  # type: ignore

                raw_path = storage_path
                if raw_path.startswith("s3://"):
                    temp_path = ensure_learning_profile_storage_dir(
                        settings=self.settings,
                        reader_id=0,
                        profile_id=0,
                    ) / "tmp_source.pdf"
                    temp_path.write_bytes(self.blob_store.read_bytes(raw_path))
                    reader = PdfReader(str(temp_path))
                else:
                    reader = PdfReader(str(raw_path))
                page_texts = [(page.extract_text() or "").strip() for page in reader.pages]
                text = "\n\n".join(item for item in page_texts if item)
                if text:
                    return text
            except Exception:
                pass
        if suffix in {".docx", ".pptx", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".pdf"} and self.mineru_client.is_enabled():
            local_path = self._materialize_local_source(storage_path=storage_path, file_name=file_name)
            parsed = self.mineru_client.parse_path(local_path)
            results = parsed.get("results") or {}
            first_payload = next(iter(results.values()), {})
            md_content = first_payload.get("md_content")
            if md_content:
                return str(md_content)
        raise RuntimeError(f"Unsupported source type for extraction: {mime_type or suffix or 'unknown'}")

    def _materialize_local_source(self, *, storage_path: str, file_name: str | None) -> str:
        if not storage_path.startswith("s3://"):
            return storage_path
        temp_dir = ensure_learning_profile_storage_dir(settings=self.settings, reader_id=0, profile_id=0) / "tmp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        target = temp_dir / _safe_filename(file_name, fallback="source.bin")
        target.write_bytes(self.blob_store.read_bytes(storage_path))
        return str(target)

    def _build_fragments(self, text: str) -> list[dict[str, Any]]:
        chunks = chunk_text(
            text,
            chunk_size=self.settings.learning_chunk_size,
            overlap=self.settings.learning_chunk_overlap,
        )
        embeddings = self.embedding_provider.embed_texts(chunks) if chunks else []
        rows: list[dict[str, Any]] = []
        offset = 0
        for index, content in enumerate(chunks):
            snippet = " ".join(content.split())[:72]
            rows.append(
                {
                    "chunk_index": index,
                    "fragment_type": "text",
                    "chapter_label": _chapter_label(index),
                    "semantic_summary": snippet,
                    "content": content,
                    "content_tsv": _token_string(content),
                    "citation_anchor_json": {
                        "chapterLabel": _chapter_label(index),
                        "offsetStart": offset,
                        "offsetEnd": offset + len(content),
                    },
                    "embedding": embeddings[index] if index < len(embeddings) else None,
                    "metadata_json": {"length": len(content)},
                }
            )
            offset += len(content)
        return rows


class LearningBridgeService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.embedding_provider = build_embedding_provider(self.settings)

    def expand_step_to_explore(
        self,
        session: Session,
        *,
        reader_id: int,
        guide_session_id: int,
    ) -> dict[str, Any]:
        guide_session = repository.require_owned_session(session, session_id=guide_session_id, reader_id=reader_id)
        if getattr(guide_session, "session_kind", "guide") != "guide":
            raise ApiError(409, "bridge_requires_guide_session", "Only guide sessions can expand into explore mode")

        profile = repository.require_owned_profile(session, profile_id=guide_session.profile_id, reader_id=reader_id)
        if profile.active_path_version_id is None:
            raise ApiError(409, "learning_path_missing", "Learning profile does not have an active path version")

        steps = [serialize_path_step(step) for step in repository.list_path_steps(session, path_version_id=profile.active_path_version_id)]
        if not steps:
            raise ApiError(409, "learning_path_missing_steps", "Learning path does not contain any steps")

        current_index = min(guide_session.current_step_index, max(len(steps) - 1, 0))
        current_step = steps[current_index]

        existing = repository.get_linked_explore_session(
            session,
            source_session_id=guide_session.id,
            focus_step_index=current_index,
        )
        focus_context = self._build_focus_context(
            session,
            guide_session_id=guide_session.id,
            current_step=current_step,
        )
        if existing is not None:
            existing.focus_context_json = focus_context
            existing.current_step_title = focus_context["stepTitle"]
            explore_session = existing
        else:
            explore_session = repository.create_session(
                session,
                profile_id=profile.id,
                learning_mode=guide_session.learning_mode,
                current_step_title=focus_context["stepTitle"],
                session_kind="explore",
                source_session_id=guide_session.id,
                focus_step_index=current_index,
                focus_context_json=focus_context,
            )

        recommended_prompts = self._build_recommended_prompts(focus_context)
        action = repository.create_bridge_action(
            session,
            action_type="expand_step_to_explore",
            from_session_id=guide_session.id,
            from_turn_id=None,
            to_session_id=explore_session.id,
            status="completed",
            payload_json={"stepIndex": current_index},
            result_json={"recommendedPrompts": recommended_prompts},
        )
        return {
            "action": action,
            "session": explore_session,
            "recommended_prompts": recommended_prompts,
        }

    def attach_explore_turn_to_guide_step(
        self,
        session: Session,
        *,
        reader_id: int,
        explore_session_id: int,
        turn_id: int | None,
        target_guide_session_id: int | None,
        target_step_index: int | None,
    ) -> dict[str, Any]:
        if turn_id is None:
            raise ApiError(400, "bridge_turn_required", "turnId is required")

        explore_session = repository.require_owned_session(session, session_id=explore_session_id, reader_id=reader_id)
        if getattr(explore_session, "session_kind", "guide") != "explore":
            raise ApiError(409, "bridge_requires_explore_session", "Only explore sessions can attach turns back to guide mode")

        guide_session_id = target_guide_session_id or getattr(explore_session, "source_session_id", None)
        if guide_session_id is None:
            raise ApiError(400, "bridge_target_guide_required", "targetGuideSessionId is required")

        guide_session = repository.require_owned_session(session, session_id=guide_session_id, reader_id=reader_id)
        step_index = target_step_index if target_step_index is not None else guide_session.current_step_index
        turn = repository.get_session_turn(session, session_id=explore_session.id, turn_id=turn_id)
        if turn is None:
            raise ApiError(404, "learning_turn_not_found", "Learning turn not found")

        content = "\n".join(
            piece
            for piece in [turn.user_content or "", turn.assistant_content or ""]
            if piece.strip()
        ).strip()
        summary = (turn.assistant_content or turn.user_content or "")[:200].strip()
        title = f"自由探索补充：步骤 {step_index + 1}"

        context_item = repository.create_step_context_item(
            session,
            guide_session_id=guide_session.id,
            step_index=step_index,
            source_session_id=explore_session.id,
            source_turn_id=turn.id,
            title=title,
            summary=summary,
            content=content or summary or title,
            citations_json=turn.citations_json or [],
            related_concepts_json=turn.related_concepts_json or [],
            embedding=self.embedding_provider.embed_texts([content or summary or title])[0],
            metadata_json={
                "bridgeSource": "explore",
                "focusContext": getattr(explore_session, "focus_context_json", None) or {},
            },
        )
        action = repository.create_bridge_action(
            session,
            action_type="attach_explore_turn_to_guide_step",
            from_session_id=explore_session.id,
            from_turn_id=turn.id,
            to_session_id=guide_session.id,
            status="completed",
            payload_json={"targetStepIndex": step_index},
            result_json={"contextItemId": context_item.id},
        )
        return {"action": action, "context_item": context_item}

    def _build_focus_context(
        self,
        session: Session,
        *,
        guide_session_id: int,
        current_step: dict[str, Any],
    ) -> dict[str, Any]:
        recent_turns = list(repository.list_session_turns(session, session_id=guide_session_id))
        recent_citations = recent_turns[-1].citations_json if recent_turns else []
        return {
            "stepIndex": current_step["stepIndex"],
            "stepTitle": current_step["title"],
            "objective": current_step.get("objective"),
            "guidingQuestion": current_step.get("guidingQuestion"),
            "keywords": current_step.get("keywords") or [],
            "recentCitations": recent_citations or [],
        }

    def _build_recommended_prompts(self, focus_context: dict[str, Any]) -> list[str]:
        keywords = focus_context.get("keywords") or []
        step_title = focus_context.get("stepTitle") or "当前步骤"
        objective = focus_context.get("objective") or "请结合资料继续展开说明。"
        prompts = [
            f"请围绕“{step_title}”做一个更通俗的解释。",
            f"如果从实验/应用场景出发，{step_title}最值得关注什么？",
            objective,
        ]
        for keyword in keywords[:2]:
            prompts.append(f"请重点解释“{keyword}”在这一部分里的作用。")
        deduped: list[str] = []
        for prompt in prompts:
            if prompt not in deduped:
                deduped.append(prompt)
        return deduped[:4]
