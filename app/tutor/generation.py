from __future__ import annotations

import hashlib
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.recommendation.embeddings import build_book_embedding_text, build_embedding_provider
from app.tutor import repository
from app.tutor.llm_service import TutorLLMService
from app.tutor.models import TutorGenerationJob, TutorProfile, TutorSourceDocument


FILENAME_SANITIZER = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_filename(value: str | None, *, fallback: str) -> str:
    cleaned = FILENAME_SANITIZER.sub("-", (value or "").strip()).strip("-")
    return cleaned or fallback


def profile_storage_dir(*, reader_id: int, profile_id: int) -> Path:
    settings = get_settings()
    root = Path(settings.tutor_storage_dir).expanduser()
    return root / f"reader_{reader_id}" / f"profile_{profile_id}"


def ensure_profile_storage_dir(*, reader_id: int, profile_id: int) -> Path:
    target = profile_storage_dir(reader_id=reader_id, profile_id=profile_id)
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
    return " ".join(token.lower() for token in re.findall(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]+", text or ""))


def build_book_source_text(profile: TutorProfile, book) -> str:
    lines = [
        f"# {profile.title}",
        "",
        build_book_embedding_text(
            title=book.title,
            author=book.author,
            category=book.category,
            keywords=book.keywords,
            summary=book.summary,
        ),
    ]
    if profile.teaching_goal:
        lines.extend(["", f"teaching_goal: {profile.teaching_goal}"])
    return "\n".join(lines)


def extract_text_from_file(*, source_document: TutorSourceDocument) -> str:
    storage_path = Path(source_document.storage_path or "")
    if not storage_path.exists():
        raise RuntimeError("Uploaded source file not found")

    suffix = storage_path.suffix.lower()
    raw_bytes = storage_path.read_bytes()
    if suffix in {".md", ".markdown", ".txt"}:
        return raw_bytes.decode("utf-8")
    if suffix == ".pdf":
        try:
            from pypdf import PdfReader  # type: ignore
        except Exception as exc:  # pragma: no cover - optional dependency
            raise RuntimeError("PDF extraction requires the pypdf package") from exc
        reader = PdfReader(str(storage_path))
        pages = [(page.extract_text() or "").strip() for page in reader.pages]
        text = "\n\n".join(page for page in pages if page)
        if not text:
            raise RuntimeError("Could not extract text from PDF")
        return text
    raise RuntimeError(f"Unsupported source file type: {suffix or 'unknown'}")


def persist_extracted_text(
    *,
    profile: TutorProfile,
    source_document: TutorSourceDocument,
    text: str,
) -> Path:
    base_dir = ensure_profile_storage_dir(reader_id=profile.reader_id, profile_id=profile.id)
    sources_dir = base_dir / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)
    target = sources_dir / f"extracted_{source_document.id}.md"
    target.write_text(text, encoding="utf-8")
    return target


def build_chunks(text: str) -> list[dict]:
    settings = get_settings()
    provider = build_embedding_provider()
    content_chunks = chunk_text(
        text,
        chunk_size=settings.tutor_chunk_size,
        overlap=settings.tutor_chunk_overlap,
    )
    embeddings = provider.embed_texts(content_chunks) if content_chunks else []
    rows: list[dict] = []
    for index, content in enumerate(content_chunks):
        rows.append(
            {
                "chunk_index": index,
                "content": content,
                "content_tsv": _token_string(content),
                "embedding": embeddings[index] if index < len(embeddings) else None,
                "metadata_json": {
                    "length": len(content),
                },
            }
        )
    return rows


def _read_uploaded_bytes(source_document: TutorSourceDocument) -> bytes:
    if not source_document.storage_path:
        return b""
    path = Path(source_document.storage_path)
    if not path.exists():
        return b""
    return path.read_bytes()


def _prepare_source_text(session: Session, profile: TutorProfile, source_document: TutorSourceDocument) -> str:
    if profile.source_type == "book":
        if profile.book_id is None:
            raise RuntimeError("Book-based tutor profile is missing book_id")
        book = repository.require_book(session, book_id=profile.book_id)
        text = build_book_source_text(profile, book)
        target = persist_extracted_text(profile=profile, source_document=source_document, text=text)
        source_document.file_name = source_document.file_name or f"book-{book.id}.md"
        source_document.extracted_text_path = str(target)
        source_document.content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        source_document.parse_status = "parsed"
        source_document.metadata_json = {
            **(source_document.metadata_json or {}),
            "bookId": book.id,
            "bookTitle": book.title,
            "sourceKind": "synthetic-book-metadata",
        }
        return text

    text = extract_text_from_file(source_document=source_document)
    target = persist_extracted_text(profile=profile, source_document=source_document, text=text)
    source_document.extracted_text_path = str(target)
    source_document.parse_status = "parsed"
    source_document.content_hash = hashlib.sha256(_read_uploaded_bytes(source_document)).hexdigest() or hashlib.sha256(
        text.encode("utf-8")
    ).hexdigest()
    return text


def _mark_failure(
    *,
    profile: TutorProfile,
    job: TutorGenerationJob,
    source_document: TutorSourceDocument | None,
    code: str,
    message: str,
) -> None:
    profile.status = "failed"
    profile.failure_code = code
    profile.failure_message = message
    job.status = "failed"
    job.error_message = message
    if source_document is not None:
        source_document.parse_status = "failed"
        source_document.metadata_json = {
            **(source_document.metadata_json or {}),
            "failureCode": code,
            "failureMessage": message,
        }


def run_generation_pipeline(session: Session, *, profile_id: int) -> TutorProfile:
    llm_service = TutorLLMService()
    profile = repository.get_profile(session, profile_id=profile_id)
    if profile is None:
        raise RuntimeError(f"Tutor profile {profile_id} not found")
    source_document = repository.get_primary_source_document(session, profile_id=profile_id)
    if source_document is None:
        raise RuntimeError(f"Tutor profile {profile_id} does not have a source document")
    job = repository.get_latest_profile_job(session, profile_id=profile_id)
    if job is None:
        raise RuntimeError(f"Tutor profile {profile_id} does not have a generation job")

    profile.status = "processing"
    profile.failure_code = None
    profile.failure_message = None
    job.status = "processing"
    job.attempt_count = (job.attempt_count or 0) + 1
    job.error_message = None
    session.flush()

    try:
        source_text = _prepare_source_text(session, profile, source_document)
        chunks = build_chunks(source_text)
        repository.replace_document_chunks(
            session,
            profile_id=profile.id,
            document_id=source_document.id,
            chunks=chunks,
        )
        source_summary = llm_service.summarize_source(
            title=profile.title,
            teaching_goal=profile.teaching_goal,
            text=source_text,
        )
        persona = llm_service.generate_persona(
            title=profile.title,
            teaching_goal=profile.teaching_goal,
            source_summary=source_summary,
        )
        curriculum = llm_service.generate_curriculum(
            title=profile.title,
            teaching_goal=profile.teaching_goal,
            source_summary=source_summary,
            source_text=source_text,
        )
        profile.source_summary = source_summary
        profile.persona_json = persona
        profile.curriculum_json = curriculum
        profile.status = "ready"
        profile.failure_code = None
        profile.failure_message = None
        job.status = "completed"
        source_document.metadata_json = {
            **(source_document.metadata_json or {}),
            "chunkCount": len(chunks),
        }
        session.flush()
        return profile
    except Exception as exc:
        _mark_failure(
            profile=profile,
            job=job,
            source_document=source_document,
            code="generation_failed",
            message=str(exc),
        )
        session.flush()
        raise
