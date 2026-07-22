from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.rag import answer_question, get_static_response


router = APIRouter(prefix="/api", tags=["chatbot"])


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)


@router.post("/chat")
def chat(request: ChatRequest):
    static_response = get_static_response(request.question)
    if static_response:
        return {
            "answer": static_response,
            "sources": [],
            "response_type": "greeting",
        }

    try:
        result = answer_question(request.question)
        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "response_type": result.get("response_type", "rag"),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
