from functools import lru_cache

from sentence_transformers import SentenceTransformer


MODEL_NAME = "BAAI/bge-small-en-v1.5"


@lru_cache(maxsize=1)
def get_embedding_model():
    return SentenceTransformer(MODEL_NAME)


def generate_embeddings(text_chunks):
    if isinstance(text_chunks, str):
        text_chunks = [text_chunks]

    model = get_embedding_model()
    embeddings = model.encode(
        text_chunks,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embeddings.tolist()
