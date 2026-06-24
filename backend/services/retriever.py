from services.embeddings import generate_embeddings
from services.vector_store import search_documents


def retrieve_relevant_chunks(question, top_k=5):
    query_embedding = generate_embeddings(question)[0]
    return search_documents(query_embedding=query_embedding, top_k=top_k)
