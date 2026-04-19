"""
POST /extract-syllabus — extract topics from an uploaded syllabus PDF.
"""

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from rag.syllabus_extractor import extract

router = APIRouter()


@router.post("/extract-syllabus")
async def extract_syllabus(
    subject: str = Form(...),
    syllabus_pdf: UploadFile = File(...),
):
    """
    Extract key topics from a syllabus PDF for a given subject.

    Multipart form with:
      - subject (text field)
      - syllabus_pdf (PDF file)

    Returns { "subject": "...", "topics": [...] }
    """
    if not syllabus_pdf.content_type or "pdf" not in syllabus_pdf.content_type:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        pdf_bytes = await syllabus_pdf.read()
        result = await extract(subject=subject, pdf_bytes=pdf_bytes)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Syllabus extraction failed: {str(e)}",
        )
