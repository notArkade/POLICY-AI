import os
import string

from google import genai

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
POLICY_KEYWORDS = {
    "absence",
    "attendance",
    "benefit",
    "benefits",
    "company",
    "conduct",
    "department",
    "employee",
    "employees",
    "hr",
    "holiday",
    "holidays",
    "hour",
    "hours",
    "leave",
    "onboarding",
    "policy",
    "policies",
    "probation",
    "recruitment",
    "rule",
    "rules",
    "salary",
    "shift",
    "sick",
    "vacation",
    "work",
    "working",
}


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


def _is_policy_related(question):
    normalized_question = _normalize_question(question)
    words = set(normalized_question.split())
    return bool(words & POLICY_KEYWORDS)


def get_static_response(question):
    if _is_greeting(question):
        return GREETING_ANSWER

    if not _is_policy_related(question):
        return FALLBACK_ANSWER

    return None


def _build_prompt(context, question):
    return f"""You are an HR Policy Assistant.

Use a polite, formal tone.

Answer ONLY from the provided policy context. Do not use general knowledge.

Unrelated non-policy questions should already be filtered before this prompt. If one still appears, respond exactly with:

"{FALLBACK_ANSWER}"

If the user's question is policy-related but the relevant policy is not present in the provided context, respond exactly with:

"{NO_INDEXED_POLICIES_ANSWER}"

Context:
{context}

Question:
{question}
"""


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

    context = "\n\n---\n\n".join(match["chunk"] for match in matches)

    if not context.strip():
        return {"answer": NO_INDEXED_POLICIES_ANSWER, "sources": []}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=_build_prompt(context, question),
    )

    return {
        "answer": response.text or NO_INDEXED_POLICIES_ANSWER,
        "sources": matches,
    }
