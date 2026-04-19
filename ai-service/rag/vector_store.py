"""
ChromaDB vector store for the question bank.

Stores questions with metadata (subject, marks, difficulty, topic) and
supports similarity search with optional subject filtering.
"""

import logging
from typing import List, Optional, Dict, Any

from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from config import GOOGLE_API_KEY, CHROMA_PERSIST_DIR

logger = logging.getLogger(__name__)

# ── Singleton vector store instance ──────────────────────────────

_store: Optional[Chroma] = None


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    """Return embedding model instance."""
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=GOOGLE_API_KEY,
    )


def get_store() -> Chroma:
    """Return (and lazily initialise) the ChromaDB vector store."""
    global _store
    if _store is None:
        logger.info("Initialising ChromaDB at %s", CHROMA_PERSIST_DIR)
        _store = Chroma(
            collection_name="question_bank",
            embedding_function=_get_embeddings(),
            persist_directory=CHROMA_PERSIST_DIR,
        )
    return _store


# ── Public helpers ────────────────────────────────────────────────

def add_questions(questions: List[Dict[str, Any]]) -> int:
    """
    Add questions to the vector store.

    Each question dict should have at least:
      - text (str):     the question text
      - subject (str):  subject name

    Optional metadata fields: marks, difficulty, topic.

    Returns the number of questions added.
    """
    store = get_store()

    texts: List[str] = []
    metadatas: List[Dict[str, Any]] = []

    for q in questions:
        texts.append(q["text"])
        meta: Dict[str, Any] = {"subject": q["subject"]}
        if q.get("marks") is not None:
            meta["marks"] = q["marks"]
        if q.get("difficulty"):
            meta["difficulty"] = q["difficulty"]
        if q.get("topic"):
            meta["topic"] = q["topic"]
        metadatas.append(meta)

    store.add_texts(texts=texts, metadatas=metadatas)
    logger.info("Added %d questions to vector store", len(texts))
    return len(texts)


def search(
    query: str,
    top_k: int = 5,
    subject: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Similarity search over the question bank.

    Returns a list of dicts with keys: text, subject, marks, difficulty, topic, score.
    """
    store = get_store()

    where_filter = None
    if subject:
        where_filter = {"subject": subject}

    results = store.similarity_search_with_relevance_scores(
        query, k=top_k, filter=where_filter
    )

    output: List[Dict[str, Any]] = []
    for doc, score in results:
        entry: Dict[str, Any] = {
            "text": doc.page_content,
            "subject": doc.metadata.get("subject", ""),
            "marks": doc.metadata.get("marks"),
            "difficulty": doc.metadata.get("difficulty"),
            "topic": doc.metadata.get("topic"),
            "score": round(float(score), 4),
        }
        output.append(entry)

    return output
