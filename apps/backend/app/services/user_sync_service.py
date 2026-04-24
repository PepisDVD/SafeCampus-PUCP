from __future__ import annotations

import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.core.config import settings
from app.core.exceptions import ForbiddenError
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.auth import CurrentUserRolesResponse, UserSyncResponse


class UserSyncService:
    def __init__(
        self,
        repository: UserSyncRepository,
        auth_client: SupabaseAuthClient | None = None,
    ) -> None:
        self._repository = repository
        self._auth_client = auth_client or SupabaseAuthClient()

    async def sync_user(
        self,
        *,
        access_token: str,
        ip_origen: str | None,
        user_agent: str | None,
    ) -> UserSyncResponse:
        auth_user = await self._auth_client.fetch_user(access_token)

        if not _is_allowed_institutional_email(auth_user.email):
            raise ForbiddenError(
                f"Solo se permite el acceso con correos @{settings.ALLOWED_INSTITUTIONAL_DOMAIN}",
            )

        nombre, apellido = _resolve_nombre_apellido(
            email=auth_user.email,
            nombre=auth_user.nombre,
            apellido=auth_user.apellido,
        )

        user_row = await self._repository.find_user_by_auth_user_id(auth_user.auth_user_id)
        is_new_user = False

        if not user_row:
            user_row = await self._repository.find_user_by_email(auth_user.email)

        if not user_row:
            is_new_user = True
            user_id = await self._repository.create_user(
                auth_user_id=auth_user.auth_user_id,
                email=auth_user.email,
                nombre=nombre,
                apellido=apellido,
                email_verificado=auth_user.email_verified,
                avatar_url=auth_user.avatar_url,
                provider=auth_user.provider,
            )
        else:
            user_id = str(user_row["id"])
            await self._repository.update_user(
                user_id=user_id,
                auth_user_id=auth_user.auth_user_id,
                email=auth_user.email,
                nombre=nombre,
                apellido=apellido,
                email_verificado=auth_user.email_verified,
                avatar_url=auth_user.avatar_url,
                provider=auth_user.provider,
            )

        current_roles = await self._repository.list_role_names(user_id)
        if is_new_user or not current_roles:
            await self._repository.assign_role_if_missing(
                user_id=user_id,
                role_id=UUID(settings.DEFAULT_COMMUNITY_ROLE_ID),
            )

        roles = await self._repository.list_role_names(user_id)

        await self._repository.insert_session(
            user_id=user_id,
            token_hash=_hash_token(access_token),
            ip_origen=ip_origen,
            user_agent=user_agent,
            fecha_expiracion=_extract_expiration(access_token),
        )

        return UserSyncResponse(
            user_id=user_id,
            email=auth_user.email,
            roles=roles,
            is_new_user=is_new_user,
        )

    async def get_current_user_roles(self, *, access_token: str) -> CurrentUserRolesResponse:
        auth_user = await self._auth_client.fetch_user(access_token)

        user_row = await self._repository.find_user_by_auth_user_id(auth_user.auth_user_id)
        if not user_row:
            user_row = await self._repository.find_user_by_email(auth_user.email)

        if not user_row:
            raise ForbiddenError("No existe un usuario del sistema asociado a la sesión actual")

        user_id = str(user_row["id"])
        roles = await self._repository.list_role_names(user_id)

        return CurrentUserRolesResponse(
            user_id=user_id,
            email=auth_user.email,
            roles=roles,
        )


def _is_allowed_institutional_email(email: str) -> bool:
    normalized = email.strip().lower()
    return normalized.endswith(f"@{settings.ALLOWED_INSTITUTIONAL_DOMAIN}")


def _resolve_nombre_apellido(*, email: str, nombre: str | None, apellido: str | None) -> tuple[str, str]:
    safe_nombre = (nombre or "").strip()
    safe_apellido = (apellido or "").strip()

    if safe_nombre and safe_apellido:
        return safe_nombre[:100], safe_apellido[:100]

    if safe_nombre and not safe_apellido:
        parts = safe_nombre.split(" ")
        if len(parts) > 1:
            return parts[0][:100], " ".join(parts[1:])[:100]
        return safe_nombre[:100], "PUCP"

    username = email.split("@", maxsplit=1)[0].replace(".", " ").replace("_", " ").strip()
    if not username:
        return "Usuario", "PUCP"

    tokens = [token for token in username.split(" ") if token]
    if len(tokens) == 1:
        return tokens[0][:100].title(), "PUCP"

    return tokens[0][:100].title(), " ".join(tokens[1:])[:100].title()


def _hash_token(access_token: str) -> str:
    return hashlib.sha256(access_token.encode("utf-8")).hexdigest()


def _extract_expiration(access_token: str) -> datetime:
    try:
        token_parts = access_token.split(".")
        if len(token_parts) < 2:
            raise ValueError("JWT invalido")

        payload_b64 = token_parts[1]
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload_raw = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        payload = json.loads(payload_raw)
        exp = int(payload["exp"])
        return datetime.fromtimestamp(exp, tz=UTC)
    except Exception:
        return datetime.now(tz=UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
