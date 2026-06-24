from pathlib import Path
from uuid import uuid4

import chromadb


BASE_DIR = Path(__file__).resolve().parent.parent
VECTOR_DB_DIR = BASE_DIR / "vectordb"
COLLECTION_NAME = "policies"


def get_collection():
    VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(VECTOR_DB_DIR))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def add_documents(chunks, embeddings, metadata):
    if not chunks:
        raise ValueError("No chunks were generated from the uploaded document.")

    collection = get_collection()
    ids = [f"{metadata['policy_id']}:{index}:{uuid4().hex}" for index in range(len(chunks))]
    metadatas = [{**metadata, "chunk_index": index} for index in range(len(chunks))]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    return ids


def search_documents(query_embedding, top_k=5):
    collection = get_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

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
