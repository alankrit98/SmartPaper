"""
Pydantic models for all FastAPI request / response payloads.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ══════════════════════════════════════════════════════════════════
#  Generate Paper — Request
# ══════════════════════════════════════════════════════════════════

class PatternItem(BaseModel):
    """One section definition in the question paper pattern."""
    section: str = Field(..., description="Section label, e.g. 'A', 'B', 'C'")
    title: Optional[str] = Field(default=None, description="Section title, e.g. 'Short Answer Questions'")
    questions: int = Field(..., ge=1, description="Number of questions in this section")
    marksEach: int = Field(..., ge=1, description="Marks per question")
    questionType: Optional[str] = Field(default="single", description="single | subparts | choice_group")
    attemptRule: Optional[str] = Field(default=None, description="e.g. 'Attempt all questions'")


class GeneratePaperRequest(BaseModel):
    subject: str = Field(..., description="Subject name, e.g. 'Data Structures'")
    subject_code: Optional[str] = Field(default=None, description="Subject code, e.g. 'BCS501'")
    exam: Optional[str] = Field(default=None, description="Exam name, e.g. 'End Semester Examination'")
    duration: Optional[str] = Field(default="3 Hours", description="Exam duration")
    difficulty: str = Field(..., description="easy | medium | hard")
    pattern: List[PatternItem] = Field(..., min_length=1)
    topics: Optional[List[str]] = Field(default=None, description="Optional syllabus topics")
    instructions: Optional[List[str]] = Field(default=None, description="Optional exam instructions")


# ══════════════════════════════════════════════════════════════════
#  Generate Paper — Response (rich JSON format)
# ══════════════════════════════════════════════════════════════════

class SubQuestion(BaseModel):
    label: str
    text: str
    marks: int
    difficulty: Optional[str] = None
    topic: Optional[str] = None
    co: Optional[int] = None
    bloom_level: Optional[str] = None


class ChoiceOption(BaseModel):
    label: str
    text: str
    marks: int
    difficulty: Optional[str] = None
    topic: Optional[str] = None


class QuestionOut(BaseModel):
    question_id: int
    type: str  # single | subparts | choice_group
    marks: int
    subquestions: Optional[List[SubQuestion]] = None
    options: Optional[List[ChoiceOption]] = None


class SectionOut(BaseModel):
    section_id: str
    title: str
    description: Optional[str] = None
    marks_scheme: Optional[str] = None
    attempt_rule: Optional[str] = None
    questions: List[QuestionOut]


class PaperMetadata(BaseModel):
    exam: Optional[str] = None
    subject: str
    subject_code: Optional[str] = None
    duration: Optional[str] = None
    max_marks: int


class GeneratePaperResponse(BaseModel):
    metadata: PaperMetadata
    instructions: List[str]
    sections: List[SectionOut]


# ══════════════════════════════════════════════════════════════════
#  Add Questions to Vector Store
# ══════════════════════════════════════════════════════════════════

class QuestionInput(BaseModel):
    """A question to be added to the vector store."""
    text: str
    subject: str
    marks: Optional[int] = None
    difficulty: Optional[str] = None
    topic: Optional[str] = None


class AddQuestionsRequest(BaseModel):
    questions: List[QuestionInput] = Field(..., min_length=1)


class AddQuestionsResponse(BaseModel):
    message: str
    added: int


# ══════════════════════════════════════════════════════════════════
#  Search
# ══════════════════════════════════════════════════════════════════

class SearchResult(BaseModel):
    text: str
    subject: str
    marks: Optional[int] = None
    difficulty: Optional[str] = None
    topic: Optional[str] = None
    score: Optional[float] = None


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResult]


# ══════════════════════════════════════════════════════════════════
#  Syllabus Extraction
# ══════════════════════════════════════════════════════════════════

class SyllabusResponse(BaseModel):
    subject: str
    topics: List[str]
