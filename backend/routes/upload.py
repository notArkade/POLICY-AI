from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.chunker import create_chunks
from services.document_loader import SUPPORTED_SUFFIXES, load_document
from services.embeddings import generate_embeddings
from services.policy_registry import add_policy, delete_policy, get_policy, list_policies
from services.vector_store import add_documents, delete_policy_documents


router = APIRouter(prefix="/api/policies", tags=["policies"])

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"


def _save_upload(file: UploadFile, policy_id: str):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        allowed = ", ".join(sorted(SUPPORTED_SUFFIXES))
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {allowed}")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or f"policy{suffix}").name
    file_path = UPLOAD_DIR / f"{policy_id}_{safe_name}"

    with file_path.open("wb") as output:
        output.write(file.file.read())

    return file_path, safe_name


@router.post("/upload")
async def upload_policy(
    policy_name: str = Form(...),
    department: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...),
):
    policy_id = str(uuid4())
    file_path = None

    try:
        file_path, original_file_name = _save_upload(file, policy_id)
        text = load_document(file_path)
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
                "stored_file_name": file_path.name,
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
        if file_path and file_path.exists():
            file_path.unlink()
        delete_policy_documents(policy_id)
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

    delete_policy_documents(policy_id)
    delete_policy(policy_id)

    stored_file_name = policy.get("stored_file_name")
    if stored_file_name:
        file_path = UPLOAD_DIR / stored_file_name
        if file_path.exists():
            file_path.unlink()

    return {"success": True, "message": "Policy deleted successfully"}
