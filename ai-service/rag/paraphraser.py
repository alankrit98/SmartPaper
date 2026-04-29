"""
Paraphraser — rewrites question texts using the Hugging Face Inference API.

Uses a modern instruction-tuned model via the huggingface_hub InferenceClient.
Falls back gracefully to the original text on any failure.
"""

import logging
import time
from typing import Dict, Any, Optional

from huggingface_hub import InferenceClient

from config import HUGGINGFACE_API_KEY, PARAPHRASE_MODEL

logger = logging.getLogger(__name__)

# Minimum text length worth paraphrasing — very short strings
# (labels, single words) are returned unchanged.
MIN_PARAPHRASE_LENGTH = 20

# Default model to use for paraphrasing (instruction-tuned LLM)
DEFAULT_MODEL = "meta-llama/Llama-3.2-1B-Instruct"


def _get_client() -> Optional[InferenceClient]:
    """Create and return an InferenceClient, or None if no API key."""
    if not HUGGINGFACE_API_KEY:
        return None
    return InferenceClient(api_key=HUGGINGFACE_API_KEY)


def _call_hf_api(text: str, retries: int = 2) -> Optional[str]:
    """
    Call the Hugging Face Inference API to paraphrase a single text.

    Returns the paraphrased text, or None on failure.
    """
    client = _get_client()
    if client is None:
        return None

    model = PARAPHRASE_MODEL if PARAPHRASE_MODEL else DEFAULT_MODEL

    for attempt in range(retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a concise paraphrasing tool. "
                            "Reword the given exam question using different words. "
                            "Keep the SAME length, SAME meaning, and SAME academic tone. "
                            "Output ONLY the reworded question — no explanation, no answer, "
                            "no extra text, no prefix like 'Here is'."
                        ),
                    },
                    {
                        "role": "user",
                        "content": text,
                    },
                ],
                max_tokens=min(len(text) * 2, 512),
                temperature=0.7,
            )

            generated = response.choices[0].message.content.strip()

            # Take only the first non-empty line (model may ramble)
            lines = [ln.strip() for ln in generated.split("\n") if ln.strip()]
            if lines:
                generated = lines[0]
            else:
                return None

            # Strip common unwanted prefixes
            for prefix in ("Here is", "Here's", "Paraphrased:", "Reworded:"):
                if generated.lower().startswith(prefix.lower()):
                    generated = generated[len(prefix):].strip().lstrip(":-").strip()

            # Only use if the paraphrase is meaningfully different
            if generated and generated.lower() != text.lower():
                return generated
            return None

        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "loading" in error_msg.lower():
                wait_time = min(10 * (attempt + 1), 30)
                logger.info(
                    "HF model loading, waiting %.1fs (attempt %d/%d)",
                    wait_time, attempt + 1, retries + 1,
                )
                time.sleep(wait_time)
                continue

            logger.warning("HF API error: %s", e)
            return None

    return None


def paraphrase_text(text: str) -> str:
    """
    Paraphrase a single text string.

    Returns the paraphrased version, or the original text if
    paraphrasing fails or the text is too short.
    """
    if not text or len(text.strip()) < MIN_PARAPHRASE_LENGTH:
        return text

    result = _call_hf_api(text.strip())
    if result:
        return result
    return text


def paraphrase_paper(paper: Dict[str, Any]) -> Dict[str, Any]:
    """
    Walk a generated paper JSON and paraphrase all question texts.

    Modifies the paper dict in-place and returns it.
    Paraphrases:
      - subquestions[].text
      - options[].text  (choice group alternatives)
    """
    if not HUGGINGFACE_API_KEY:
        logger.info("HUGGINGFACE_API_KEY not set — skipping paraphrasing")
        return paper

    sections = paper.get("sections", [])
    total = 0
    paraphrased = 0

    for section in sections:
        for question in section.get("questions", []):
            # Paraphrase sub-questions
            for sq in question.get("subquestions", []):
                original = sq.get("text", "")
                if original:
                    total += 1
                    new_text = paraphrase_text(original)
                    if new_text != original:
                        sq["text"] = new_text
                        paraphrased += 1

            # Paraphrase choice-group options
            for opt in question.get("options", []):
                original = opt.get("text", "")
                if original:
                    total += 1
                    new_text = paraphrase_text(original)
                    if new_text != original:
                        opt["text"] = new_text
                        paraphrased += 1

    logger.info(
        "Paraphrasing complete — %d/%d questions reworded", paraphrased, total
    )
    return paper
