import os
import string

from google import genai
from google.genai import types

from services.vector_store import get_document_count


FALLBACK_ANSWER = (
    "I am sorry, but that is beyond my knowledge. I can only answer questions based on the uploaded policy documents."
)
NO_INDEXED_POLICIES_ANSWER = (
    "I am sorry, but I do not have any indexed policy documents available right now. Please upload the policy documents again or ensure the vector database is available."
)
GREETING_ANSWER = (
    "Hello. I am the HR Policy Assistant. How may I help you with the uploaded policy documents today?"
)

GREETING_WORDS = {
    "aloha",
    "greetings",
    "hello",
    "hey",
    "hiya",
    "howdy",
    "hi",
    "namaste",
    "sup",
    "yo",
    "hello there",
    "hola",
}
GREETING_PHRASES = {
    "good afternoon",
    "good day",
    "good evening",
    "good morning",
    "hope you are well",
    "how are you",
    "whats up",
}

# Supabase's match_document_chunks RPC returns cosine similarity (higher is
# better). A 0.45 minimum rejects weak semantic matches while still allowing
# differently worded questions about a policy to be answered. It remains
# configurable because embedding models/corpora can have different score ranges.
DEFAULT_RETRIEVAL_THRESHOLD = 0.45

SYSTEM_INSTRUCTION = f"""You are an HR Policy Assistant.

Answer only from the retrieved policy context supplied by the user. Never use
outside knowledge or invent policy details. If the context does not explicitly
support a confident answer, respond exactly with:

{FALLBACK_ANSWER}

If retrieved documents conflict, clearly say that the uploaded documents contain
conflicting information. Use a professional, concise tone. Cite every document
used at the end of the answer with its document name and page number when one is
available."""


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

    if any(normalized_question.startswith(f"{phrase} ") for phrase in GREETING_PHRASES):
        return len(words) <= 6

    return words[0] in GREETING_WORDS and len(words) <= 6


def get_static_response(question):
    """Only greetings bypass retrieval; relevance is decided by vector search."""
    if _is_greeting(question):
        return GREETING_ANSWER
    return None


def _retrieval_threshold():
    try:
        return float(os.getenv("RAG_RETRIEVAL_THRESHOLD", DEFAULT_RETRIEVAL_THRESHOLD))
    except ValueError:
        return DEFAULT_RETRIEVAL_THRESHOLD


def _has_sufficient_retrieval_quality(matches):
    if not matches:
        return False
    try:
        return float(matches[0].get("score", 0)) >= _retrieval_threshold()
    except (TypeError, ValueError):
        return False


def _build_context(matches):
    context_chunks = []
    for match in matches:
        metadata = match.get("metadata") or {}
        document_name = metadata.get("file_name") or metadata.get("policy_name") or "Unknown document"
        page_number = metadata.get("page_number")
        section = metadata.get("section") or metadata.get("category")

        details = [f"Document: {document_name}"]
        if page_number is not None:
            details.append(f"Page: {page_number}")
        if section:
            details.append(f"Section: {section}")
        details.append(f"Content:\n{match.get('chunk', '').strip()}")
        context_chunks.append("\n\n".join(details))

    return "\n\n---\n\n".join(context_chunks)


def _build_user_prompt(context, question):
    """Keep behavioral rules in Gemini's system instruction, not this prompt."""
    return f"Retrieved policy context:\n{context}\n\nQuestion:\n{question}"


def answer_question(question):
    static_response = get_static_response(question)
    if static_response:
        return {"answer": static_response, "sources": []}

    if get_document_count() == 0:
        return {"answer": NO_INDEXED_POLICIES_ANSWER, "sources": []}

    try:
        from services.retriever import retrieve_relevant_chunks

        matches = retrieve_relevant_chunks(question, top_k=5)
    except Exception as exc:
        if "expecting embedding with dimension" in str(exc).lower():
            return {"answer": FALLBACK_ANSWER, "sources": []}
        raise

    if not _has_sufficient_retrieval_quality(matches):
        return {"answer": FALLBACK_ANSWER, "sources": matches or []}

    context = _build_context(matches)
    if not context.strip():
        return {"answer": FALLBACK_ANSWER, "sources": matches}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=_build_user_prompt(context, question),
        config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION),
    )

    return {
        "answer": response.text or FALLBACK_ANSWER,
        "sources": matches,
    }
