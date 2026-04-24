from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_access_token, get_session
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.auth import CurrentUserRolesResponse, UserSyncResponse
from app.services.user_sync_service import UserSyncService

router = APIRouter()


@router.post("/sync-user", response_model=UserSyncResponse)
async def sync_authenticated_user(
    request: Request,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    repository = UserSyncRepository(db)
    service = UserSyncService(repository=repository, auth_client=SupabaseAuthClient())

    forwarded_for = request.headers.get("x-forwarded-for")
    ip_origen = forwarded_for.split(",", maxsplit=1)[0].strip() if forwarded_for else None

    return await service.sync_user(
        access_token=access_token,
        ip_origen=ip_origen,
        user_agent=request.headers.get("user-agent"),
    )


@router.get("/current-roles", response_model=CurrentUserRolesResponse)
async def get_current_user_roles(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    repository = UserSyncRepository(db)
    service = UserSyncService(repository=repository, auth_client=SupabaseAuthClient())
    return await service.get_current_user_roles(access_token=access_token)
