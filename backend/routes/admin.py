from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.supabase_storage import get_supabase_client


router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(credentials: AdminLoginRequest):
    result = (
        get_supabase_client()
        .table("admin_credentials")
        .select("id")
        .eq("username", credentials.username)
        .eq("password", credentials.password)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    return {"success": True}
