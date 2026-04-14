from __future__ import annotations

from app.tutor.llm_service import TutorLLMService


class _TimeoutingCompletions:
    def create(self, **kwargs):
        raise RuntimeError("timeout")


class _TimeoutingChat:
    def __init__(self):
        self.completions = _TimeoutingCompletions()


class _TimeoutingClient:
    def __init__(self):
        self.chat = _TimeoutingChat()


def test_generate_curriculum_falls_back_when_llm_request_fails():
    service = TutorLLMService()
    service.client = _TimeoutingClient()

    curriculum = service.generate_curriculum(
        title="OCR 与文档数字化",
        teaching_goal="理解 OCR 流程",
        source_summary="介绍 OCR、数字化和识别流程。",
        source_text="OCR 用于把图像中的文字转成可搜索、可编辑的文本，并支撑数字化归档。",
    )

    assert curriculum["title"] == "OCR 与文档数字化导学路径"
    assert len(curriculum["steps"]) >= 1
