from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.chunker import create_chunks
from services.document_loader import SUPPORTED_SUFFIXES, load_document
from services.embeddings import generate_embeddings
from services.policy_registry import add_policy, delete_policy, get_policy, list_policies
from services.supabase_storage import delete_policy_file, upload_policy_file
from services.vector_store import add_documents, delete_policy_documents


router = APIRouter(prefix="/api/policies", tags=["policies"])

BASE_DIR = Path(__file__).resolve().parent.parent
TEMP_UPLOAD_DIR = BASE_DIR / "tmp_uploads"


def _prepare_upload(file: UploadFile, policy_id: str):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        allowed = ", ".join(sorted(SUPPORTED_SUFFIXES))
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {allowed}")

    TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or f"policy{suffix}").name
    storage_path = f"policies/{policy_id}/{safe_name}"
    temp_file_path = TEMP_UPLOAD_DIR / f"{policy_id}_{safe_name}"
    file_bytes = file.file.read()

    with temp_file_path.open("wb") as output:
        output.write(file_bytes)

    return temp_file_path, safe_name, storage_path, file_bytes


@router.post("/upload")
async def upload_policy(
    policy_name: str = Form(...),
    department: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...),
):
    policy_id = str(uuid4())
    temp_file_path = None
    storage_path = None
    uploaded_to_storage = False

    try:
        temp_file_path, original_file_name, storage_path, file_bytes = _prepare_upload(file, policy_id)
        upload_policy_file(storage_path, file_bytes, original_file_name)
        uploaded_to_storage = True

        text = load_document(temp_file_path)
        chunks = create_chunks(text)
        embeddings = generate_embeddings(chunks)

        metadata = {
            "policy_id": policy_id,
            "policy_name": policy_name,
            "department": department,
            "category": category,
            "file_name": original_file_name,
        }
        add_documents(chunks, embeddings, metadata)

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
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if temp_file_path and temp_file_path.exists():
            temp_file_path.unlink()


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
