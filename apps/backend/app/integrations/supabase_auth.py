from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalServiceError, UnauthorizedError


@dataclass(slots=True)
class SupabaseAuthUser:
    auth_user_id: str
    email: str
    email_verified: bool
    provider: str | None
    nombre: str | None
    apellido: str | None
    avatar_url: str | None


class SupabaseAuthClient:
    def __init__(self, base_url: str | None = None, anon_key: str | None = None) -> None:
        self._base_url = (base_url or settings.SUPABASE_URL).strip().rstrip("/")
        self._anon_key = (anon_key or settings.SUPABASE_ANON_KEY).strip()

    async def fetch_user(self, access_token: str) -> SupabaseAuthUser:
        if not self._base_url or not self._anon_key:
            raise ExternalServiceError(
                "Configuracion incompleta: SUPABASE_URL y SUPABASE_ANON_KEY son obligatorios en backend.",
            )

        headers = {
            "Authorization": f"Bearer {access_token}",
            "apikey": self._anon_key,
        }
        user_url = f"{self._base_url}/auth/v1/user"

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(user_url, headers=headers)

        if response.status_code in (401, 403):
            raise UnauthorizedError("Token de sesion invalido o expirado")

        if response.status_code >= 400:
            raise ExternalServiceError("No fue posible validar el token con Supabase Auth")

        payload = response.json()
        auth_user_id = str(payload.get("id") or "").strip()
        email = str(payload.get("email") or "").strip().lower()
        if not auth_user_id or not email:
            raise UnauthorizedError("Supabase Auth no devolvio identidad valida")

        app_metadata = payload.get("app_metadata") or {}
        user_metadata = payload.get("user_metadata") or {}

        return SupabaseAuthUser(
            auth_user_id=auth_user_id,
            email=email,
            email_verified=bool(payload.get("email_confirmed_at")),
            provider=app_metadata.get("provider"),
            nombre=_clean_name(user_metadata.get("given_name") or user_metadata.get("name")),
            apellido=_clean_name(user_metadata.get("family_name")),
            avatar_url=_clean_name(user_metadata.get("avatar_url") or user_metadata.get("picture")),
        )


def _clean_name(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None
