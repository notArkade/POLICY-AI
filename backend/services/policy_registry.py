from services.supabase_storage import get_supabase_client


def _to_api_record(record):
    """Keep the existing API response field name while using database columns."""
    if not record:
        return record
    return {**record, "upload_date": record.get("uploaded_at")}


def add_policy(policy):
    result = get_supabase_client().table("documents").insert(policy).execute()
    if not result.data:
        raise RuntimeError("Supabase did not return the inserted document metadata.")
    return _to_api_record(result.data[0])


def list_policies():
    result = get_supabase_client().table("documents").select("*").order("uploaded_at", desc=True).execute()
    return [_to_api_record(record) for record in (result.data or [])]


def get_policy(policy_id):
    result = get_supabase_client().table("documents").select("*").eq("id", policy_id).limit(1).execute()
    return _to_api_record(result.data[0]) if result.data else None


def delete_policy(policy_id):
    result = get_supabase_client().table("documents").delete().eq("id", policy_id).execute()
    return bool(result.data)
