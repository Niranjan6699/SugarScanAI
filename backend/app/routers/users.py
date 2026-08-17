from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_active_user
from app.schemas.user import UserResponse, UserUpdateRequest, HealthProfileResponse, HealthProfileUpsertRequest
from app.services.supabase_service import get_health_profile
from app.services.profile_service import update_user_profile, upsert_health_profile
from app.core.security import get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_active_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdateRequest,
    current_user = Depends(get_current_active_user),
):
    update_data = {}
    if data.full_name is not None:
        update_data["full_name"] = data.full_name
    # if data.phone is not None:
    #     update_data["phone"] = data.phone  # Assuming phone exists in profile schema if needed
    if data.avatar_url is not None:
        update_data["avatar_url"] = data.avatar_url
    if data.password is not None:
        pass # Handle password update with Supabase Auth directly on client-side ideally
        
    if update_data:
        await update_user_profile(str(current_user.id), update_data)
        
    return current_user # Returns old user obj, but for a PATCH it's fine unless we fetch fresh


@router.get("/me/health", response_model=HealthProfileResponse)
async def get_health_profile_endpoint(
    current_user = Depends(get_current_active_user),
):
    hp = await get_health_profile(str(current_user.id))
    if hp is None:
        # Auto-create blank profile
        hp = await upsert_health_profile(str(current_user.id), {})
    return hp


@router.put("/me/health", response_model=HealthProfileResponse)
async def upsert_health_profile_endpoint(
    data: HealthProfileUpsertRequest,
    current_user = Depends(get_current_active_user),
):
    update_data = data.model_dump(exclude_none=True)
    hp = await upsert_health_profile(str(current_user.id), update_data)
    return hp
