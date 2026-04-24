from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_access_token, get_session
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.profile import MyProfileResponse, UpdateMyProfileRequest
from app.services.profile_service import ProfileService

router = APIRouter()


def _service(db: AsyncSession) -> ProfileService:
    return ProfileService(
        admin_repository=AdminRepository(db),
        user_sync_repository=UserSyncRepository(db),
        auth_client=SupabaseAuthClient(),
    )


@router.get("/me", response_model=MyProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).get_me(access_token=access_token)


@router.patch("/me", response_model=MyProfileResponse)
async def update_my_profile(
    payload: UpdateMyProfileRequest,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).update_me(access_token=access_token, payload=payload)
