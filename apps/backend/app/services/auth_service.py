"""
Business logic for backend-owned Google/Supabase authentication.
"""

import base64
import hashlib
import secrets
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode, urlsplit, urlunsplit

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, verify_password
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import AuthProfileUpdateInput, AuthUserResponse


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = AuthRepository(db)

    def build_google_login_url(self, email: str, next_path: str) -> str:
        normalized_email = email.strip().lower()
        if not self._is_allowed_login_email(normalized_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Correo no autorizado para iniciar sesión.",
            )

        safe_next_path = self._sanitize_next_path(next_path)
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = self._code_challenge(code_verifier)
        state = create_access_token(
            {
                "kind": "oauth_state",
                "email": normalized_email,
                "next": safe_next_path,
                "code_verifier": code_verifier,
            },
            expires_delta=timedelta(minutes=10),
        )

        callback_url = self._callback_url_with_oauth_state(state)
        params: dict[str, str] = {
            "provider": "google",
            "redirect_to": callback_url,
            "code_challenge": code_challenge,
            "code_challenge_method": "s256",
            "prompt": "select_account",
            "login_hint": normalized_email,
        }
        # Solo restringir el chooser de Google al dominio institucional cuando
        # NO se trata de un correo en la dev allowlist (los gmail dev fallarían
        # con `hd=pucp.edu.pe`).
        if normalized_email not in settings.dev_allowed_emails_set:
            params["hd"] = settings.ALLOWED_INSTITUTIONAL_DOMAIN
        return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/authorize?{urlencode(params)}"

    async def complete_google_callback(
        self,
        code: str,
        state: str,
    ) -> tuple[AuthUserResponse, str, str]:
        state_payload = decode_access_token(state)
        if not state_payload or state_payload.get("kind") != "oauth_state":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estado OAuth invalido.",
            )

        code_verifier = str(state_payload.get("code_verifier") or "")
        next_path = self._sanitize_next_path(str(state_payload.get("next") or "/dashboard"))
        supabase_session = await self._exchange_code_for_session(code, code_verifier)
        user = await self.sync_supabase_user_data(supabase_session["user"])
        session_token = self._create_user_session_token(user)
        return user, session_token, next_path

    async def login_operator_with_password(
        self,
        *,
        email: str,
        password: str,
    ) -> tuple[AuthUserResponse, str]:
        normalized_email = email.strip().lower()
        profile = await self._repo.get_user_credentials_by_email(normalized_email)
        if (
            not profile
            or profile.get("estado") != "ACTIVO"
            or not profile.get("password_hash")
            or not verify_password(password, str(profile["password_hash"]))
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales invalidas.",
            )

        roles = await self._repo.list_role_names(str(profile["id"]))
        if not {"operador", "supervisor", "administrador"}.intersection(roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La app movil esta habilitada para personal operativo.",
            )

        user = self._build_auth_user_response(profile, roles)
        return user, self._create_user_session_token(user)

    async def login_mobile_with_supabase_access_token(
        self,
        access_token: str,
    ) -> tuple[AuthUserResponse, str]:
        supabase_user = await self._get_supabase_user(access_token)
        user = await self.sync_supabase_user_data(
            supabase_user,
            assign_default_admin=False,
        )
        if not {"operador", "supervisor", "administrador"}.intersection(user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La app movil esta habilitada para personal operativo.",
            )
        return user, self._create_user_session_token(user)

    async def sync_supabase_user_data(
        self,
        supabase_user: dict[str, Any],
        *,
        assign_default_admin: bool = True,
    ) -> AuthUserResponse:
        email = str(supabase_user.get("email", "")).strip().lower()
        if not self._is_allowed_login_email(email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Correo no autorizado para iniciar sesión.",
            )

        metadata = supabase_user.get("user_metadata") or {}
        nombre, apellido = self._resolve_names(email, metadata)
        usuario = await self._repo.upsert_oauth_user(
            {
                "email": email,
                "nombre": nombre,
                "apellido": apellido,
                "avatar_url": metadata.get("avatar_url") or metadata.get("picture"),
                "email_verificado": bool(
                    supabase_user.get("email_confirmed_at") or metadata.get("email_verified")
                ),
                "auth_provider": "google",
                "auth_user_id": supabase_user["id"],
            }
        )

        roles = await self._repo.list_role_names(str(usuario["id"]))
        if not roles and assign_default_admin:
            role_id = await self._repo.get_role_id_by_name("administrador")
            if role_id:
                await self._repo.assign_role(str(usuario["id"]), role_id)
                roles = await self._repo.list_role_names(str(usuario["id"]))

        return self._build_auth_user_response(usuario, roles)

    async def get_user_from_session_token(self, session_token: str | None) -> AuthUserResponse:
        if not session_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesion requerida.",
            )

        payload = decode_access_token(session_token)
        if not payload or payload.get("kind") != "user_session":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesion invalida.",
            )

        profile = await self._repo.get_user_profile(str(payload.get("sub") or ""))
        if not profile or profile.get("estado") != "ACTIVO":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autorizado.",
            )

        roles = await self._repo.list_role_names(str(profile["id"]))
        return self._build_auth_user_response(profile, roles)

    async def update_current_user_profile(
        self,
        current_user_id: str,
        data: AuthProfileUpdateInput,
    ) -> AuthUserResponse:
        await self._repo.update_user_profile(
            current_user_id,
            {
                "nombre": data.nombre.strip(),
                "apellido": data.apellido.strip(),
                "telefono": data.telefono.strip() if data.telefono else None,
                "departamento": data.departamento.strip() if data.departamento else None,
            },
        )

        profile = await self._repo.get_user_profile(current_user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado.",
            )

        roles = await self._repo.list_role_names(str(profile["id"]))
        return self._build_auth_user_response(profile, roles)

    async def _exchange_code_for_session(self, code: str, code_verifier: str) -> dict[str, Any]:
        if not code_verifier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verificador OAuth faltante.",
            )

        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=pkce"
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
                json={"auth_code": code, "code_verifier": code_verifier},
            )

        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No se pudo completar OAuth con Supabase.",
            )

        data = response.json()
        if not data.get("access_token") or not data.get("user"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Respuesta OAuth incompleta.",
            )
        return data

    async def _get_supabase_user(self, access_token: str) -> dict[str, Any]:
        token = access_token.strip()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de acceso requerido.",
            )

        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )

        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesion institucional invalida.",
            )
        return response.json()

    @staticmethod
    def _is_allowed_login_email(email: str) -> bool:
        normalized = email.strip().lower()
        if normalized.endswith(f"@{settings.ALLOWED_INSTITUTIONAL_DOMAIN}"):
            return True
        return normalized in settings.dev_allowed_emails_set

    @staticmethod
    def _resolve_names(email: str, metadata: dict[str, Any]) -> tuple[str, str]:
        full_name = str(metadata.get("full_name") or metadata.get("name") or "").strip()
        if full_name:
            parts = full_name.split()
            return parts[0], " ".join(parts[1:]) or "-"

        local_part = email.split("@", 1)[0]
        return local_part, "-"

    @staticmethod
    def _code_challenge(code_verifier: str) -> str:
        digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
        return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")

    @staticmethod
    def _sanitize_next_path(raw_path: str | None) -> str:
        if not raw_path or raw_path == "/":
            return "/dashboard"
        if not raw_path.startswith("/") or raw_path.startswith("//"):
            return "/dashboard"
        return raw_path

    @staticmethod
    def _callback_url_with_oauth_state(oauth_state: str) -> str:
        callback_url = (
            f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}"
            f"{settings.API_V1_PREFIX}/auth/google/callback"
        )
        parts = urlsplit(callback_url)
        query = urlencode({"oauth_state": oauth_state})
        return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))

    @staticmethod
    def _create_user_session_token(user: AuthUserResponse) -> str:
        return create_access_token(
            {
                "kind": "user_session",
                "sub": user.id,
                "email": user.email,
                "roles": user.roles,
            }
        )

    @staticmethod
    def _build_auth_user_response(
        profile: dict[str, Any],
        roles: list[str],
    ) -> AuthUserResponse:
        return AuthUserResponse(
            id=str(profile["id"]),
            email=str(profile["email"]),
            nombre=str(profile["nombre"]),
            apellido=str(profile["apellido"]),
            avatar_url=profile.get("avatar_url"),
            codigo_institucional=profile.get("codigo_institucional"),
            telefono=profile.get("telefono"),
            departamento=profile.get("departamento"),
            roles=roles,
        )
