"""
Syllabus PDF extractor — sends the PDF directly to Google Gemini
using the google.genai SDK (which natively supports PDF input).
"""

import json
import logging
from typing import List

from google import genai

from config import GOOGLE_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

# Configure the client once
_client = genai.Client(api_key=GOOGLE_API_KEY)


async def extract(subject: str, pdf_bytes: bytes) -> dict:
    """
    Extract syllabus topics by sending the PDF directly to Gemini.

    Args:
        subject:   the subject name, e.g. "Data Structures"
        pdf_bytes: raw bytes of the uploaded PDF

    Returns:
        { "subject": "...", "topics": ["topic1", "topic2", ...] }
    """
    if not pdf_bytes:
        logger.warning("Empty PDF received for subject: %s", subject)
        return {"subject": subject, "topics": []}

    prompt = (
        f'This PDF contains the syllabus for the subject "{subject}".\n\n'
        "Extract ALL the main topics and subtopics from this syllabus.\n"
        "Return ONLY a JSON object — no markdown, no code fences, no explanation.\n\n"
        f"Return JSON in this exact format:\n"
        f'{{"subject": "{subject}", "topics": ["Topic 1", "Topic 2", ...]}}'
    )

    # Send PDF bytes directly to Gemini
    response = _client.models.generate_content(
        model=LLM_MODEL,
        contents=[
            genai.types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
            prompt,
        ],
        config=genai.types.GenerateContentConfig(temperature=0.3),
    )

    # Parse JSON from response
    raw_text = response.text.strip()
    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM response as JSON: %s", raw_text[:200])
        return {"subject": subject, "topics": []}

    topics = parsed.get("topics", [])
    logger.info("Extracted %d topics for %s", len(topics), subject)

    return {"subject": subject, "topics": topics}
