from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.rag import answer_question


router = APIRouter(prefix="/api", tags=["chatbot"])


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)


@router.post("/chat")
def chat(request: ChatRequest):
    try:
        result = answer_question(request.question)
        return {
            "answer": result["answer"],
            "sources": result["sources"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
