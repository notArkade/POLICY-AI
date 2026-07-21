"""Supabase pgvector-backed document chunk storage.

The public function names intentionally match the former Chroma adapter so the
RAG and route layers keep their existing behavior.
"""
from services.supabase_storage import get_supabase_client


def get_document_count():
    result = get_supabase_client().table("document_chunks").select("id", count="exact").limit(1).execute()
    return result.count or 0


def add_documents(chunks, embeddings, metadata, page_numbers=None):
    if not chunks:
        raise ValueError("No chunks were generated from the uploaded document.")
    if len(chunks) != len(embeddings):
        raise ValueError("The number of chunks and embeddings must match.")

    page_numbers = page_numbers or [None] * len(chunks)
    if len(page_numbers) != len(chunks):
        raise ValueError("The number of chunk page references must match the chunks.")
    rows = [
        {
            "document_id": metadata["policy_id"],
            "chunk_number": index,
            "page_number": page_number,
            "chunk_text": chunk,
            "embedding": embedding,
        }
        for index, (chunk, embedding, page_number) in enumerate(zip(chunks, embeddings, page_numbers))
    ]
    result = get_supabase_client().table("document_chunks").insert(rows).execute()
    if len(result.data or []) != len(rows):
        raise RuntimeError("Supabase did not store every document chunk.")
    return [row["id"] for row in result.data]


def search_documents(query_embedding, top_k=5):
    result = get_supabase_client().rpc(
        "match_document_chunks",
        {"query_embedding": query_embedding, "match_count": top_k},
    ).execute()
    return [
        {
            "chunk": row["chunk_text"],
            "metadata": {
                "policy_id": row["document_id"],
                "policy_name": row["policy_name"],
                "department": row["department"],
                "category": row["category"],
                "file_name": row["file_name"],
                "chunk_index": row["chunk_number"],
                "page_number": row.get("page_number"),
            },
            "score": float(row["similarity"]),
        }
        for row in (result.data or [])
    ]


def delete_policy_documents(policy_id):
    # Normally the database FK cascade handles this. Keeping this function
    # makes rollback and callers from the previous storage implementation safe.
    return get_supabase_client().table("document_chunks").delete().eq("document_id", policy_id).execute()
