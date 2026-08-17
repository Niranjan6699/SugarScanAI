from typing import Any, Dict
from app.services.supabase_service import get_supabase

async def upsert_health_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    # Check if exists
    result = sb.table("health_profiles").select("id").eq("user_id", user_id).execute()
    if result.data:
        res = sb.table("health_profiles").update(data).eq("user_id", user_id).execute()
    else:
        data["user_id"] = user_id
        res = sb.table("health_profiles").insert(data).execute()
    if res.data:
        return res.data[0]
    raise RuntimeError(f"Failed to upsert health profile: {res}")

async def update_user_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    sb = get_supabase()
    res = sb.table("profiles").update(data).eq("id", user_id).execute()
    if res.data:
        return res.data[0]
    raise RuntimeError(f"Failed to update profile: {res}")
