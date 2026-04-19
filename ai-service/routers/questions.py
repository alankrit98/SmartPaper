"""
Question bank endpoints:
  POST /add-questions — add questions to the vector store
  GET  /search        — similarity search over the question bank
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models import AddQuestionsRequest, AddQuestionsResponse, SearchResponse, SearchResult
from rag.vector_store import add_questions, search

router = APIRouter()


@router.post("/add-questions", response_model=AddQuestionsResponse)
async def add_questions_endpoint(req: AddQuestionsRequest):
    """
    Add questions to the question bank vector store.

    Body: { "questions": [{ "text": "...", "subject": "...", ... }] }
    """
    try:
        question_dicts = [q.model_dump() for q in req.questions]
        count = add_questions(question_dicts)
        return AddQuestionsResponse(
            message=f"Successfully added {count} questions to the bank.",
            added=count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add questions: {str(e)}")


@router.get("/search", response_model=SearchResponse)
async def search_endpoint(
    query: str = Query(..., description="Search text"),
    top_k: int = Query(5, ge=1, le=50, description="Number of results"),
    subject: Optional[str] = Query(None, description="Optional subject filter"),
):
    """
    Similarity search over the question bank.

    Returns matching questions with relevance scores.
    """
    try:
        results = search(query=query, top_k=top_k, subject=subject)
        search_results = [SearchResult(**r) for r in results]
        return SearchResponse(
            query=query,
            total=len(search_results),
            results=search_results,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
