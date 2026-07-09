from pathlib import Path
from functools import lru_cache
from uuid import uuid4
import re

import chromadb


BASE_DIR = Path(__file__).resolve().parent.parent
VECTOR_DB_DIR = BASE_DIR / "vectordb"
COLLECTION_NAME = "policies"
DIMENSION_ERROR_PATTERN = re.compile(
    r"expecting embedding with dimension of (?P<expected>\d+), got (?P<actual>\d+)",
    re.IGNORECASE,
)


class EmbeddingDimensionMismatchError(RuntimeError):
    def __init__(self, expected, actual):
        super().__init__(
            "The existing vector database was created with "
            f"{expected}-dimension embeddings, but the current embedding model produces "
            f"{actual}-dimension embeddings. The old index has been cleared. "
            "Please re-upload the policy documents so they can be indexed with the current model."
        )
        self.expected = expected
        self.actual = actual


@lru_cache(maxsize=1)
def get_client():
    VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(VECTOR_DB_DIR))


@lru_cache(maxsize=1)
def get_collection():
    return get_client().get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def get_document_count():
    return get_collection().count()


def reset_collection_cache():
    get_collection.cache_clear()


def clear_collection():
    get_client().delete_collection(COLLECTION_NAME)
    reset_collection_cache()


def _handle_dimension_error(exc):
    match = DIMENSION_ERROR_PATTERN.search(str(exc))
    if not match:
        raise exc

    clear_collection()
    raise EmbeddingDimensionMismatchError(
        expected=match.group("expected"),
        actual=match.group("actual"),
    ) from exc


def add_documents(chunks, embeddings, metadata):
    if not chunks:
        raise ValueError("No chunks were generated from the uploaded document.")

    collection = get_collection()
    ids = [f"{metadata['policy_id']}:{index}:{uuid4().hex}" for index in range(len(chunks))]
    metadatas = [{**metadata, "chunk_index": index} for index in range(len(chunks))]

    try:
        collection.add(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )
    except Exception as exc:
        _handle_dimension_error(exc)

    return ids


def search_documents(query_embedding, top_k=5):
    collection = get_collection()
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        _handle_dimension_error(exc)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    matches = []
    for document, metadata, distance in zip(documents, metadatas, distances):
        matches.append(
            {
                "chunk": document,
                "metadata": metadata,
                "score": 1 - float(distance),
            }
        )
    return matches


def delete_policy_documents(policy_id):
    collection = get_collection()
    collection.delete(where={"policy_id": policy_id})
