from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.chunker import create_chunks
from services.document_loader import SUPPORTED_SUFFIXES, get_page_texts_from_bytes, load_document_bytes
from services.embeddings import generate_embeddings
from services.policy_registry import add_policy, delete_policy, get_policy, list_policies
from services.supabase_storage import delete_policy_file, upload_policy_file
from services.vector_store import add_documents, delete_policy_documents


router = APIRouter(prefix="/api/policies", tags=["policies"])


def _chunk_page_numbers(chunks, page_texts):
    """Associate each existing chunk with its source PDF page without changing chunking."""
    if not page_texts:
        return [None] * len(chunks)
    page_offsets = []
    offset = 0
    for page_number, page_text in enumerate(page_texts, start=1):
        page_offsets.append((offset, offset + len(page_text), page_number))
        offset += len(page_text) + 1

    cursor = 0
    page_numbers = []
    for chunk in chunks:
        position = "\n".join(page_texts).find(chunk, max(0, cursor - 150))
        if position < 0:
            position = cursor
        cursor = position
        page_numbers.append(next((number for start, end, number in page_offsets if start <= position < end), None))
    return page_numbers

def _prepare_upload(file_name: str, policy_id: str, file_bytes: bytes):
    from pathlib import Path

    suffix = Path(file_name).suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        allowed = ", ".join(sorted(SUPPORTED_SUFFIXES))
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {allowed}")

    safe_name = Path(file_name or f"policy{suffix}").name
    storage_path = f"policies/{policy_id}/{safe_name}"
    return safe_name, storage_path, file_bytes


@router.post("/upload")
async def upload_policy(
    policy_name: str = Form(...),
    department: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...),
):
    policy_id = str(uuid4())
    storage_path = None
    uploaded_to_storage = False

    try:
        file_bytes = await file.read()
        original_file_name, storage_path, file_bytes = _prepare_upload(file.filename or "", policy_id, file_bytes)
        upload_policy_file(storage_path, file_bytes, original_file_name)
        uploaded_to_storage = True

        text = load_document_bytes(file_bytes, original_file_name)
        chunks = create_chunks(text)
        embeddings = generate_embeddings(chunks)
        page_numbers = _chunk_page_numbers(chunks, get_page_texts_from_bytes(file_bytes, original_file_name))

        metadata = {
            "policy_id": policy_id,
            "policy_name": policy_name,
            "department": department,
            "category": category,
            "file_name": original_file_name,
        }
        record = add_policy(
            {
                "id": policy_id,
                "policy_name": policy_name,
                "department": department,
                "category": category,
                "description": description,
                "file_name": original_file_name,
                "storage_path": storage_path,
                "chunk_count": len(chunks),
            }
        )
        add_documents(chunks, embeddings, metadata, page_numbers)

        return {
            "success": True,
            "message": "Policy uploaded successfully",
            "policy": record,
        }
    except HTTPException:
        raise
    except Exception as exc:
        if uploaded_to_storage and storage_path:
            try:
                delete_policy_file(storage_path)
            except Exception:
                pass
        try:
            delete_policy_documents(policy_id)
        except Exception:
            pass
        try:
            delete_policy(policy_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("")
def get_policies():
    return {"policies": list_policies()}


@router.get("/{policy_id}")
def get_policy_by_id(policy_id: str):
    policy = get_policy(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"policy": policy}


@router.delete("/{policy_id}")
def delete_policy_by_id(policy_id: str):
    policy = get_policy(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    storage_path = policy.get("storage_path")
    if storage_path:
        delete_policy_file(storage_path)

    delete_policy_documents(policy_id)
    delete_policy(policy_id)

    return {"success": True, "message": "Policy deleted successfully"}
