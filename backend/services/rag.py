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
POLICY_NOT_FOUND_ANSWER = (
    "I couldn't find any information about this policy in the uploaded policy documents."
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
# Scores below this value indicate that the question is unrelated to the
# uploaded HR policies. Scores between this and the retrieval threshold are
# policy-like questions whose requested policy was not found in the documents.
DEFAULT_UNRELATED_THRESHOLD = 0.20

SYSTEM_INSTRUCTION = f"""You are an HR Policy Assistant.

Answer only from the retrieved policy context supplied by the user. Never use
outside knowledge, hallucinate, or invent policy details. If the retrieved
context is relevant but does not contain the requested policy, respond exactly
with:

{POLICY_NOT_FOUND_ANSWER}

If the question is unrelated to HR policies, respond exactly with:

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
    if _is_greeting(question):
        return GREETING_ANSWER
    return None


def _retrieval_threshold():
    try:
        return float(os.getenv("RAG_RETRIEVAL_THRESHOLD", DEFAULT_RETRIEVAL_THRESHOLD))
    except ValueError:
        return DEFAULT_RETRIEVAL_THRESHOLD


def _unrelated_threshold():
    try:
        threshold = float(
            os.getenv("RAG_UNRELATED_THRESHOLD", DEFAULT_UNRELATED_THRESHOLD)
        )
        return min(threshold, _retrieval_threshold())
    except ValueError:
        return DEFAULT_UNRELATED_THRESHOLD


def _top_retrieval_score(matches):
    if not matches:
        return None
    try:
        return float(matches[0].get("score", 0))
    except (TypeError, ValueError):
        return None


def _has_sufficient_retrieval_quality(matches):
    score = _top_retrieval_score(matches)
    return score is not None and score >= _retrieval_threshold()


def _is_policy_like_question(matches):
    score = _top_retrieval_score(matches)
    return score is not None and score >= _unrelated_threshold()


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

    return f"Retrieved policy context:\n{context}\n\nQuestion:\n{question}"


def answer_question(question):
    static_response = get_static_response(question)
    if static_response:
        return {"answer": static_response, "sources": [], "response_type": "greeting"}

    if get_document_count() == 0:
        return {
            "answer": NO_INDEXED_POLICIES_ANSWER,
            "sources": [],
            "response_type": "no_documents",
        }

    try:
        from services.retriever import retrieve_relevant_chunks

        matches = retrieve_relevant_chunks(question, top_k=5)
    except Exception as exc:
        if "expecting embedding with dimension" in str(exc).lower():
            return {"answer": FALLBACK_ANSWER, "sources": [], "response_type": "fallback"}
        raise

    if not _has_sufficient_retrieval_quality(matches):
        if _is_policy_like_question(matches):
            return {
                "answer": POLICY_NOT_FOUND_ANSWER,
                "sources": matches or [],
                "response_type": "policy_not_found",
            }
        return {"answer": FALLBACK_ANSWER, "sources": matches or [], "response_type": "fallback"}

    context = _build_context(matches)
    if not context.strip():
        return {"answer": FALLBACK_ANSWER, "sources": matches, "response_type": "fallback"}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=_build_user_prompt(context, question),
        config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION),
    )

    answer = response.text or FALLBACK_ANSWER
    response_type = "rag"
    if answer == POLICY_NOT_FOUND_ANSWER:
        response_type = "policy_not_found"
    elif answer == FALLBACK_ANSWER:
        response_type = "fallback"

    return {"answer": answer, "sources": matches, "response_type": response_type}
