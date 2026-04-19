"""
POST /extract-units — extract unit-wise structure from an uploaded syllabus PDF.

Returns structured units with their topics, suitable for the
frontend to let users select specific units for paper generation.
"""

import json
import logging

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from google import genai
from config import GOOGLE_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

router = APIRouter()

_client = genai.Client(api_key=GOOGLE_API_KEY)


class UnitItem(BaseModel):
    unit_number: int
    title: str
    topics: List[str]


class ExtractUnitsResponse(BaseModel):
    subject: str
    total_units: int
    units: List[UnitItem]


@router.post("/extract-units", response_model=ExtractUnitsResponse)
async def extract_units(
    subject: str = Form(...),
    syllabus_pdf: UploadFile = File(...),
):
    """
    Extract unit-wise structure from a syllabus PDF.

    Returns:
    {
        "subject": "Data Structures",
        "total_units": 5,
        "units": [
            { "unit_number": 1, "title": "Introduction to Data Structures", "topics": [...] },
            ...
        ]
    }
    """
    if not syllabus_pdf.content_type or "pdf" not in syllabus_pdf.content_type:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        pdf_bytes = await syllabus_pdf.read()

        if not pdf_bytes:
            return ExtractUnitsResponse(subject=subject, total_units=0, units=[])

        prompt = (
            f'This PDF contains the syllabus for the subject "{subject}".\n\n'
            "Extract the UNIT-WISE structure from this syllabus.\n"
            "Identify each unit/module number, its title, and the topics covered in that unit.\n\n"
            "IMPORTANT:\n"
            "- Look for sections labeled as 'Unit', 'Module', 'Chapter', or numbered sections.\n"
            "- If no explicit unit numbering exists, group related topics into logical units.\n"
            "- Each unit should have a clear title and a list of topics.\n"
            "- Return ALL units found in the syllabus.\n\n"
            "Return ONLY a JSON object — no markdown, no code fences, no explanation.\n\n"
            "Return JSON in this exact format:\n"
            "{\n"
            f'  "subject": "{subject}",\n'
            '  "total_units": 5,\n'
            '  "units": [\n'
            '    {\n'
            '      "unit_number": 1,\n'
            '      "title": "Introduction to Data Structures",\n'
            '      "topics": ["Arrays", "Linked Lists", "Stacks"]\n'
            '    },\n'
            '    {\n'
            '      "unit_number": 2,\n'
            '      "title": "Trees and Graphs",\n'
            '      "topics": ["Binary Trees", "BST", "Graph traversal"]\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        response = _client.models.generate_content(
            model=LLM_MODEL,
            contents=[
                genai.types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                prompt,
            ],
            config=genai.types.GenerateContentConfig(temperature=0.2),
        )

        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        parsed = json.loads(raw_text)
        units_raw = parsed.get("units", [])
        units = []
        for u in units_raw:
            units.append(UnitItem(
                unit_number=u.get("unit_number", len(units) + 1),
                title=u.get("title", f"Unit {len(units) + 1}"),
                topics=u.get("topics", []),
            ))

        logger.info("Extracted %d units for %s", len(units), subject)

        return ExtractUnitsResponse(
            subject=subject,
            total_units=len(units),
            units=units,
        )

    except json.JSONDecodeError as e:
        logger.error("Failed to parse unit extraction response: %s", e)
        raise HTTPException(status_code=500, detail="AI returned invalid JSON for unit extraction.")
    except Exception as e:
        logger.error("Unit extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Unit extraction failed: {str(e)}")
