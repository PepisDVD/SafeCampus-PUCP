from __future__ import annotations

from app.core.exceptions import NotFoundError
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.profile import MyProfileResponse, UpdateMyProfileRequest


class ProfileService:
    def __init__(
        self,
        *,
        admin_repository: AdminRepository,
        user_sync_repository: UserSyncRepository,
        auth_client: SupabaseAuthClient | None = None,
    ) -> None:
        self._admin_repository = admin_repository
        self._user_sync_repository = user_sync_repository
        self._auth_client = auth_client or SupabaseAuthClient()

    async def _resolve_current_user_id(self, access_token: str) -> str:
        auth_user = await self._auth_client.fetch_user(access_token)
        user_row = await self._user_sync_repository.find_user_by_auth_user_id(auth_user.auth_user_id)
        if not user_row:
            user_row = await self._user_sync_repository.find_user_by_email(auth_user.email)
        if not user_row:
            raise NotFoundError("No se encontró el usuario asociado a la sesión")
        return str(user_row["id"])

    async def get_me(self, *, access_token: str) -> MyProfileResponse:
        user_id = await self._resolve_current_user_id(access_token)
        profile = await self._admin_repository.find_user_for_profile(user_id=user_id)
        if not profile:
            raise NotFoundError("No se encontró el perfil del usuario")

        roles = await self._user_sync_repository.list_role_names(user_id)
        return MyProfileResponse(
            id=str(profile["id"]),
            email=profile["email"],
            nombre=profile["nombre"],
            apellido=profile["apellido"],
            codigo_institucional=profile.get("codigo_institucional"),
            departamento=profile.get("departamento"),
            telefono=profile.get("telefono"),
            avatar_url=profile.get("avatar_url"),
            estado=str(profile["estado"]).lower(),
            email_verificado=bool(profile["email_verificado"]),
            ultimo_acceso=profile.get("ultimo_acceso"),
            roles=roles,
        )

    async def update_me(
        self,
        *,
        access_token: str,
        payload: UpdateMyProfileRequest,
    ) -> MyProfileResponse:
        user_id = await self._resolve_current_user_id(access_token)

        await self._admin_repository.update_my_profile(
            user_id=user_id,
            nombre=payload.nombre.strip() if payload.nombre else None,
            apellido=payload.apellido.strip() if payload.apellido else None,
            departamento=payload.departamento.strip() if payload.departamento else None,
            telefono=payload.telefono.strip() if payload.telefono else None,
            avatar_url=payload.avatar_url.strip() if payload.avatar_url else None,
        )

        return await self.get_me(access_token=access_token)
