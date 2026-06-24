import os

from google import genai

from services.retriever import retrieve_relevant_chunks


FALLBACK_ANSWER = "I could not find that information in the uploaded policy documents."


def _build_prompt(context, question):
    return f"""You are an HR Policy Assistant.

Answer ONLY from the provided policy context.

If the answer is not found in the context,
respond with:

"{FALLBACK_ANSWER}"

Context:
{context}

Question:
{question}
"""


def answer_question(question):
    matches = retrieve_relevant_chunks(question, top_k=5)
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
