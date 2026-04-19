"""
POST /validate-analysis — use AI to validate Bloom's level and CO assignments.

Sends the full question paper data to Gemini and asks it to verify
whether each question's bloom_level and CO are correctly assigned.
"""

import json
import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from google import genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import GOOGLE_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request / Response models ────────────────────────────────────

class SubQuestionIn(BaseModel):
    label: str
    text: str
    marks: int
    bloom_level: Optional[str] = None
    co: Optional[int] = None


class QuestionIn(BaseModel):
    question_id: int
    type: str
    marks: int
    subquestions: Optional[List[SubQuestionIn]] = None


class SectionIn(BaseModel):
    section_id: str
    title: str
    questions: List[QuestionIn]


class ValidateRequest(BaseModel):
    subject: str = Field(..., description="Subject name")
    sections: List[SectionIn] = Field(..., description="Full paper sections")


class CorrectionItem(BaseModel):
    question_id: int
    sub_label: str
    question_text: str
    current_bloom: Optional[str] = None
    suggested_bloom: Optional[str] = None
    bloom_correct: bool = True
    bloom_reason: Optional[str] = None
    current_co: Optional[int] = None
    suggested_co: Optional[int] = None
    co_correct: bool = True
    co_reason: Optional[str] = None


class ValidateResponse(BaseModel):
    overall_valid: bool
    total_questions: int
    issues_found: int
    corrections: List[CorrectionItem]
    summary: str


# ── Validation logic ─────────────────────────────────────────────

def _build_questions_text(sections: List[SectionIn]) -> str:
    """Flatten all questions into a numbered text for the prompt."""
    lines = []
    for section in sections:
        for q in section.questions:
            for sq in (q.subquestions or []):
                lines.append(
                    f"Q{q.question_id}-{sq.label}: \"{sq.text}\" "
                    f"[{sq.marks}m, bloom={sq.bloom_level or 'NONE'}, co={sq.co or 'NONE'}]"
                )
    return "\n".join(lines)


def _parse_json_response(raw_text: str) -> Dict[str, Any]:
    """Parse JSON from LLM response, stripping markdown fences if present."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3].strip()
    return json.loads(text)


@router.post("/validate-analysis", response_model=ValidateResponse)
async def validate_analysis(req: ValidateRequest):
    """
    Validate Bloom's taxonomy levels and CO assignments for each question
    using the Gemini LLM.
    """
    try:
        questions_text = _build_questions_text(req.sections)

        if not questions_text.strip():
            return ValidateResponse(
                overall_valid=True,
                total_questions=0,
                issues_found=0,
                corrections=[],
                summary="No questions found to validate.",
            )

        system_text = (
            "You are an expert academic quality assurance reviewer.\n"
            "Your task is to verify whether each question in an exam paper has the "
            "CORRECT Bloom's taxonomy level (K1-K6) and Course Outcome (CO) assignment.\n\n"
            "Bloom's Taxonomy Levels:\n"
            "  K1 = Remember (recall facts, definitions)\n"
            "  K2 = Understand (explain, describe, interpret)\n"
            "  K3 = Apply (use knowledge in new situations, solve problems)\n"
            "  K4 = Analyse (break down, compare, differentiate)\n"
            "  K5 = Evaluate (justify, critique, assess)\n"
            "  K6 = Create (design, construct, produce something new)\n\n"
            "CO Assignment Rules:\n"
            "  - CO numbers should logically group questions by the learning outcome they assess\n"
            "  - Related topics/concepts should share the same CO\n"
            "  - Each CO should cover a coherent area of the syllabus\n\n"
            "For each question, determine if the assigned bloom_level and co are correct.\n"
            "If incorrect, provide the suggested correct value and a brief reason.\n\n"
            "Return ONLY valid JSON — no markdown, no code fences, no explanation.\n"
            "Return in this exact format:\n"
            "{\n"
            '  "corrections": [\n'
            "    {\n"
            '      "question_id": 1,\n'
            '      "sub_label": "a",\n'
            '      "question_text": "...",\n'
            '      "current_bloom": "K1",\n'
            '      "suggested_bloom": "K2",\n'
            '      "bloom_correct": false,\n'
            '      "bloom_reason": "This question asks to explain, not just recall",\n'
            '      "current_co": 1,\n'
            '      "suggested_co": 1,\n'
            '      "co_correct": true,\n'
            '      "co_reason": null\n'
            "    }\n"
            "  ],\n"
            '  "summary": "Brief overall assessment of the paper\'s bloom/CO assignments"\n'
            "}"
        )

        human_text = (
            f"Subject: {req.subject}\n\n"
            f"Questions to validate:\n{questions_text}\n\n"
            "Analyze each question above and check if the bloom_level and co "
            "assignments are correct. Return corrections for ALL questions, "
            "marking bloom_correct=true/false and co_correct=true/false for each."
        )

        logger.info("Validating CO/Bloom assignments for %s", req.subject)

        llm = ChatGoogleGenerativeAI(
            model=LLM_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=0.3,
        )

        messages = [
            SystemMessage(content=system_text),
            HumanMessage(content=human_text),
        ]

        response = await llm.ainvoke(messages)
        result = _parse_json_response(response.content)

        corrections_raw = result.get("corrections", [])
        corrections = []
        for c in corrections_raw:
            corrections.append(CorrectionItem(
                question_id=c.get("question_id", 0),
                sub_label=c.get("sub_label", ""),
                question_text=c.get("question_text", ""),
                current_bloom=c.get("current_bloom"),
                suggested_bloom=c.get("suggested_bloom"),
                bloom_correct=c.get("bloom_correct", True),
                bloom_reason=c.get("bloom_reason"),
                current_co=c.get("current_co"),
                suggested_co=c.get("suggested_co"),
                co_correct=c.get("co_correct", True),
                co_reason=c.get("co_reason"),
            ))

        issues = sum(1 for c in corrections if not c.bloom_correct or not c.co_correct)

        return ValidateResponse(
            overall_valid=issues == 0,
            total_questions=len(corrections),
            issues_found=issues,
            corrections=corrections,
            summary=result.get("summary", "Validation complete."),
        )

    except json.JSONDecodeError as e:
        logger.error("Failed to parse validation response: %s", e)
        raise HTTPException(status_code=500, detail="AI returned invalid JSON for validation.")
    except Exception as e:
        logger.error("Validation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
