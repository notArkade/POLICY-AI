import mimetypes
import os
from functools import lru_cache

from supabase import Client, create_client


DEFAULT_BUCKET = "policy-documents"


def get_storage_bucket_name():
    return os.getenv("SUPABASE_STORAGE_BUCKET", DEFAULT_BUCKET)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise RuntimeError(
            "Supabase storage is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY."
        )

    return create_client(supabase_url, supabase_key)


def upload_policy_file(storage_path: str, file_bytes: bytes, file_name: str):
    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
    bucket = get_supabase_client().storage.from_(get_storage_bucket_name())

    return bucket.upload(
        path=storage_path,
        file=file_bytes,
        file_options={
            "content-type": content_type,
            "cache-control": "3600",
            "upsert": "false",
        },
    )


def delete_policy_file(storage_path: str):
    if not storage_path:
        return None

    bucket = get_supabase_client().storage.from_(get_storage_bucket_name())
    return bucket.remove([storage_path])
