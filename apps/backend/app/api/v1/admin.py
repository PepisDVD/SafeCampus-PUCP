from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_access_token, get_session
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.admin import (
    AdminActionResponse,
    AdminAuditLogsListResponse,
    AdminIntegrationsListResponse,
    AdminIntegrationVerifyResponse,
    AdminPermissionsListResponse,
    AdminRoleCreateRequest,
    AdminRolesListResponse,
    AdminRoleUpdateRequest,
    AdminUserCreateRequest,
    AdminUsersListResponse,
    AdminUserUpdateRequest,
    RolePermissionReplaceRequest,
    RolePermissionsListResponse,
)
from app.services.admin_service import AdminService

router = APIRouter()


def _service(db: AsyncSession) -> AdminService:
    return AdminService(
        admin_repository=AdminRepository(db),
        user_sync_repository=UserSyncRepository(db),
        auth_client=SupabaseAuthClient(),
    )


@router.get("/users", response_model=AdminUsersListResponse)
async def list_users(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).list_users(access_token=access_token)


@router.post("/users", response_model=AdminActionResponse)
async def create_user(
    payload: AdminUserCreateRequest,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).create_user(access_token=access_token, payload=payload)


@router.patch("/users/{user_id}", response_model=AdminActionResponse)
async def update_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).update_user(
        access_token=access_token,
        user_id=user_id,
        payload=payload,
    )


@router.post("/users/{user_id}/suspend", response_model=AdminActionResponse)
async def suspend_user(
    user_id: str,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).suspend_user(access_token=access_token, user_id=user_id)


@router.post("/users/{user_id}/reactivate", response_model=AdminActionResponse)
async def reactivar_user(
    user_id: str,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).reactivate_user(access_token=access_token, user_id=user_id)


@router.get("/roles", response_model=AdminRolesListResponse)
async def list_roles(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).list_roles(access_token=access_token)


@router.post("/roles", response_model=AdminActionResponse)
async def create_role(
    payload: AdminRoleCreateRequest,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).create_role(access_token=access_token, payload=payload)


@router.patch("/roles/{role_id}", response_model=AdminActionResponse)
async def update_role(
    role_id: str,
    payload: AdminRoleUpdateRequest,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).update_role(
        access_token=access_token,
        role_id=role_id,
        payload=payload,
    )


@router.delete("/roles/{role_id}", response_model=AdminActionResponse)
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).delete_role(access_token=access_token, role_id=role_id)


@router.get("/permissions", response_model=AdminPermissionsListResponse)
async def list_permissions(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).list_permissions(access_token=access_token)


@router.get("/role-permissions", response_model=RolePermissionsListResponse)
async def list_role_permissions(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).list_role_permissions(access_token=access_token)


@router.put("/roles/{role_id}/permissions", response_model=AdminActionResponse)
async def replace_role_permissions(
    role_id: str,
    payload: RolePermissionReplaceRequest,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).replace_role_permissions(
        access_token=access_token,
        role_id=role_id,
        permission_ids=payload.permission_ids,
    )


@router.get("/integrations", response_model=AdminIntegrationsListResponse)
async def list_integrations(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).list_integrations(access_token=access_token)


@router.post("/integrations/{service_name}/verify", response_model=AdminIntegrationVerifyResponse)
async def verify_integration(
    service_name: str,
    request: Request,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    forwarded_for = request.headers.get("x-forwarded-for")
    ip_origen = forwarded_for.split(",", maxsplit=1)[0].strip() if forwarded_for else None
    return await _service(db).verify_integration(
        access_token=access_token,
        service_name=service_name,
        ip_origen=ip_origen,
        dispositivo=request.headers.get("user-agent"),
    )


@router.get("/audit-logs", response_model=AdminAuditLogsListResponse)
async def list_audit_logs(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
    search: str | None = Query(default=None, alias="search"),
    event_type: str | None = Query(default=None, alias="event_type"),
    modulo: str | None = Query(default=None, alias="modulo"),
    desde: str | None = Query(default=None, alias="desde"),
    hasta: str | None = Query(default=None, alias="hasta"),
    limit: int = Query(default=50, ge=1, le=200),
):
    return await _service(db).list_audit_logs(
        access_token=access_token,
        limit=limit,
        search=search,
        event_type=event_type,
        modulo=modulo,
        desde=desde,
        hasta=hasta,
    )
