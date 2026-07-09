import os
import string

from google import genai

from services.retriever import retrieve_relevant_chunks


FALLBACK_ANSWER = (
    "I am sorry, but that is beyond my knowledge. I can only answer questions based on the uploaded policy documents."
)
GREETING_ANSWER = (
    "Hello. I am the HR Policy Assistant. How may I help you with the uploaded policy documents today?"
)

GREETING_WORDS = {"greetings", "hello", "hey", "hi"}
GREETING_PHRASES = {"good afternoon", "good evening", "good morning"}


def _normalize_question(question):
    normalized = question.strip().lower().translate(str.maketrans("", "", string.punctuation))
    return " ".join(normalized.split())


def _is_greeting(question):
    normalized_question = _normalize_question(question)
    words = normalized_question.split()

    if normalized_question in GREETING_PHRASES:
        return True

    if not words:
        return False

    return words[0] in GREETING_WORDS and len(words) <= 4


def _build_prompt(context, question):
    return f"""You are an HR Policy Assistant.

Use a polite, formal tone.

Answer ONLY from the provided policy context. Do not use general knowledge.

If the user's question is unrelated to HR policies, company policies, or the provided policy context, respond exactly with:

"{FALLBACK_ANSWER}"

If the answer is not found in the provided policy context, respond exactly with:

"{FALLBACK_ANSWER}"

Context:
{context}

Question:
{question}
"""


def answer_question(question):
    if _is_greeting(question):
        return {"answer": GREETING_ANSWER, "sources": []}

    try:
        matches = retrieve_relevant_chunks(question, top_k=5)
    except Exception as exc:
        if "expecting embedding with dimension" in str(exc).lower():
            return {"answer": FALLBACK_ANSWER, "sources": []}
        raise

    context = "\n\n---\n\n".join(match["chunk"] for match in matches)

    if not context.strip():
        return {"answer": FALLBACK_ANSWER, "sources": []}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=_build_prompt(context, question),
    )

    return {
        "answer": response.text or FALLBACK_ANSWER,
        "sources": matches,
    }
