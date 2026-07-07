import os

from google import genai


MODEL_NAME = "gemini-embedding-001"


def generate_embeddings(text_chunks):
    if isinstance(text_chunks, str):
        text_chunks = [text_chunks]

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)
    response = client.models.embed_content(
        model=MODEL_NAME,
        contents=text_chunks,
    )
    return [embedding.values for embedding in response.embeddings]
