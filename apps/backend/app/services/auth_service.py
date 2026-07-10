"""
Business logic for backend-owned Google/Supabase authentication.
"""

import base64
import hashlib
import logging
import secrets
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode, urlsplit

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import (
    AuditAccion,
    AuditEntidad,
    AuditModulo,
    AuditOrigen,
    AuditResultado,
    build_detalle,
)
from app.core.auth_policy import AuthChannel, evaluate_channel_access
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, verify_password
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import AuthProfileUpdateInput, AuthUserResponse

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = AuthRepository(db)
        self._audit = AuditoriaRepository(db)

    def build_google_login_url(
        self,
        email: str | None,
        next_path: str,
        *,
        institutional: bool = True,
        web_origin: str | None = None,
    ) -> tuple[str, str]:
        # institutional=True  → SSO exclusivo @pucp.edu.pe (chooser restringido con
        #                       `hd`); el callback vuelve a validar el dominio.
        # institutional=False → cuentas externas (Gmail); NO @pucp.edu.pe. No se
        #                       fija `hd` para permitir elegir la cuenta de Gmail.
        normalized_email = (email or "").strip().lower()
        if normalized_email:
            is_institutional = self._is_institutional_email(normalized_email)
            if institutional and not is_institutional:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "El acceso por SSO es exclusivo para cuentas institucionales @pucp.edu.pe."
                    ),
                )
            if not institutional and is_institutional:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Las cuentas institucionales @pucp.edu.pe ingresan por SSO.",
                )

        safe_next_path = self._sanitize_next_path(next_path)
        safe_web_origin = self._sanitize_web_origin(web_origin)
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = self._code_challenge(code_verifier)
        state = create_access_token(
            {
                "kind": "oauth_state",
                "email": normalized_email,
                "next": safe_next_path,
                "web_origin": safe_web_origin,
                "code_verifier": code_verifier,
                "institutional": institutional,
            },
            expires_delta=timedelta(minutes=10),
        )

        callback_url = self._callback_url(safe_web_origin)
        params: dict[str, str] = {
            "provider": "google",
            "redirect_to": callback_url,
            "code_challenge": code_challenge,
            "code_challenge_method": "s256",
            "prompt": "select_account",
        }
        if institutional:
            # Restringe el selector de Google al dominio institucional.
            params["hd"] = settings.ALLOWED_INSTITUTIONAL_DOMAIN
        if normalized_email:
            params["login_hint"] = normalized_email
        login_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/authorize?{urlencode(params)}"
        logger.info(
            "OAuth Google login generado: redirect_to=%s institutional=%s next=%s",
            callback_url,
            institutional,
            safe_next_path,
        )
        return login_url, state

    async def complete_google_callback(
        self,
        code: str,
        state: str,
        *,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ) -> tuple[AuthUserResponse, str, str, str | None]:
        state_payload = decode_access_token(state)
        if not state_payload or state_payload.get("kind") != "oauth_state":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estado OAuth invalido.",
            )

        code_verifier = str(state_payload.get("code_verifier") or "")
        next_path = self._sanitize_next_path(str(state_payload.get("next") or "/dashboard"))
        web_origin = self._sanitize_web_origin(str(state_payload.get("web_origin") or ""))
        institutional = bool(state_payload.get("institutional", True))
        supabase_session = await self._exchange_code_for_session(code, code_verifier)
        user = await self.sync_supabase_user_data(
            supabase_session["user"],
            institutional=institutional,
        )
        effective_roles = self._enforce_channel_access(
            user_id=user.id,
            email=user.email,
            roles=user.roles,
            channel=AuthChannel.WEB,
        )
        user = user.model_copy(update={"roles": effective_roles})
        session_token = self._create_user_session_token(user, AuthChannel.WEB)
        await self._audit_login(
            user=user,
            channel=AuthChannel.WEB,
            metodo="google",
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )
        return user, session_token, next_path, web_origin

    async def login_operator_with_password(
        self,
        *,
        email: str,
        password: str,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ) -> tuple[AuthUserResponse, str]:
        return await self._login_with_credentials(
            email=email,
            password=password,
            channel=AuthChannel.MOBILE,
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )

    async def login_web_with_credentials(
        self,
        *,
        email: str,
        password: str,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ) -> tuple[AuthUserResponse, str]:
        return await self._login_with_credentials(
            email=email,
            password=password,
            channel=AuthChannel.WEB,
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )

    async def _login_with_credentials(
        self,
        *,
        email: str,
        password: str,
        channel: AuthChannel,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ) -> tuple[AuthUserResponse, str]:
        normalized_email = email.strip().lower()
        # El login por credenciales es EXCLUSIVO para cuentas NO institucionales.
        # Las cuentas @pucp.edu.pe se autentican por SSO y nunca tienen contraseña.
        if (
            self._is_institutional_email(normalized_email)
            and not settings.ALLOW_INSTITUTIONAL_CREDENTIALS
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Las cuentas institucionales (@pucp.edu.pe) ingresan con SSO.",
            )

        profile = await self._repo.get_user_credentials_by_email(normalized_email)
        if (
            not profile
            or profile.get("estado") != "ACTIVO"
            or not profile.get("password_hash")
            or not verify_password(password, str(profile["password_hash"]))
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas.",
            )

        roles = await self._repo.list_role_names(str(profile["id"]))
        effective_roles = self._enforce_channel_access(
            user_id=str(profile["id"]),
            email=str(profile["email"]),
            roles=roles,
            channel=channel,
        )
        user = self._build_auth_user_response(profile, effective_roles)
        session_token = self._create_user_session_token(user, channel)
        await self._audit_login(
            user=user,
            channel=channel,
            metodo="credentials",
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )
        return user, session_token

    async def login_mobile_with_supabase_access_token(
        self,
        access_token: str,
        *,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ) -> tuple[AuthUserResponse, str]:
        supabase_user = await self._get_supabase_user(access_token)
        user = await self.sync_supabase_user_data(supabase_user)
        effective_roles = self._enforce_channel_access(
            user_id=user.id,
            email=user.email,
            roles=user.roles,
            channel=AuthChannel.MOBILE,
        )
        user = user.model_copy(update={"roles": effective_roles})
        session_token = self._create_user_session_token(user, AuthChannel.MOBILE)
        await self._audit_login(
            user=user,
            channel=AuthChannel.MOBILE,
            metodo="supabase",
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )
        return user, session_token

    def create_frontend_session_handoff_token(self, user: AuthUserResponse) -> str:
        return create_access_token(
            {
                "kind": "frontend_session_handoff",
                "sub": user.id,
                "email": user.email,
                "channel": AuthChannel.WEB.value,
            },
            expires_delta=timedelta(seconds=60),
        )

    async def exchange_frontend_session_handoff(
        self,
        handoff_token: str,
    ) -> tuple[AuthUserResponse, str]:
        payload = decode_access_token(handoff_token)
        if not payload or payload.get("kind") != "frontend_session_handoff":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Handoff de sesion invalido.",
            )

        profile = await self._repo.get_user_profile(str(payload.get("sub") or ""))
        if not profile or profile.get("estado") != "ACTIVO":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no autorizado.",
            )

        roles = await self._repo.list_role_names(str(profile["id"]))
        effective_roles = self._enforce_channel_access(
            user_id=str(profile["id"]),
            email=str(profile["email"]),
            roles=roles,
            channel=AuthChannel.WEB,
        )
        user = self._build_auth_user_response(profile, effective_roles)
        session_token = self._create_user_session_token(user, AuthChannel.WEB)
        return user, session_token

    async def _audit_login(
        self,
        *,
        user: AuthUserResponse,
        channel: AuthChannel,
        metodo: str,
        ip_origen: str | None,
        dispositivo: str | None,
    ) -> None:
        await self._audit.create_registro(
            usuario_id=user.id,
            modulo=AuditModulo.SEGURIDAD,
            accion=AuditAccion.LOGIN,
            entidad=AuditEntidad.USUARIO,
            entidad_id=user.id,
            detalle=build_detalle(
                origen=AuditOrigen.WEB if channel == AuthChannel.WEB else AuditOrigen.APP_MOVIL,
                resultado=AuditResultado.EXITOSO,
                codigo_entidad=user.email,
                resumen=f"Login de usuario {user.email}",
                metodo=metodo,
                canal=channel.value,
                roles=user.roles,
            ),
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )

    def _enforce_channel_access(
        self,
        *,
        user_id: str,
        email: str,
        roles: list[str],
        channel: AuthChannel,
    ) -> list[str]:
        """Aplica la política rol↔canal. Única y compartida por SSO y credenciales."""
        result = evaluate_channel_access(roles, channel)
        if result.is_anomalous:
            # No se deniega la cuenta entera por tener roles de ambos canales: se
            # permite el ingreso por el canal correspondiente y se registra la
            # combinación anómala para revisión del administrador.
            logger.warning(
                "Combinación de roles anómala: user=%s email=%s roles=%s canal=%s",
                user_id,
                email,
                roles,
                channel.value,
            )
        if not result.allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=result.denied_message,
            )
        return result.effective_roles

    async def sync_supabase_user_data(
        self,
        supabase_user: dict[str, Any],
        *,
        institutional: bool = True,
    ) -> AuthUserResponse:
        email = str(supabase_user.get("email", "")).strip().lower()
        if institutional:
            # El SSO es exclusivo del dominio institucional: cualquier otro correo
            # (p. ej. una cuenta de Gmail) se rechaza, aunque exista en el sistema.
            if not self._is_institutional_email(email):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "El acceso por SSO es exclusivo para cuentas institucionales @pucp.edu.pe."
                    ),
                )
        else:
            # Flujo Google para cuentas externas: NO institucional y SIN
            # auto-registro (la cuenta debe existir, provisión del admin).
            if self._is_institutional_email(email):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Las cuentas institucionales @pucp.edu.pe ingresan por SSO.",
                )
            if not await self._repo.get_user_credentials_by_email(email):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cuenta no registrada; contacte al administrador.",
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
        # Política de mínimo privilegio: un SSO institucional nuevo recibe el rol
        # comunidad. Las cuentas externas NO se auto-provisionan (sin rol → la
        # política de canal las deniega).
        if institutional and not roles:
            await self._repo.assign_role(
                str(usuario["id"]),
                settings.DEFAULT_COMMUNITY_ROLE_ID,
            )
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
        # Re-evaluación por canal en cada request (denegación por defecto
        # persistente): los roles del otro canal no aplican en esta sesión.
        channel = payload.get("channel")
        if channel in (AuthChannel.WEB.value, AuthChannel.MOBILE.value):
            result = evaluate_channel_access(roles, AuthChannel(channel))
            if not result.allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=result.denied_message,
                )
            roles = result.effective_roles
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

        data: dict[str, Any] = response.json()
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
        user: dict[str, Any] = response.json()
        return user

    @staticmethod
    def _is_institutional_email(email: str) -> bool:
        return email.strip().lower().endswith(f"@{settings.ALLOWED_INSTITUTIONAL_DOMAIN}")

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
    def _callback_url(web_origin: str | None = None) -> str:
        return f"{(web_origin or settings.web_app_url_effective).rstrip('/')}/auth/callback"

    @staticmethod
    def _sanitize_web_origin(raw_origin: str | None) -> str | None:
        if not raw_origin:
            return None

        parts = urlsplit(raw_origin.strip())
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            return None
        if parts.path not in {"", "/"} or parts.query or parts.fragment:
            return None

        host = parts.hostname or ""
        port = parts.port
        allowed_ports = {3000, 3001}
        if port not in allowed_ports:
            return None

        is_localhost = host in {"localhost", "127.0.0.1"}
        is_private_lan = (
            host.startswith("192.168.")
            or host.startswith("10.")
            or (
                host.startswith("172.")
                and len(host.split(".")) == 4
                and host.split(".")[1].isdigit()
                and 16 <= int(host.split(".")[1]) <= 31
            )
        )
        if not is_localhost and not is_private_lan:
            return None

        return f"{parts.scheme}://{parts.netloc}"

    @staticmethod
    def _create_user_session_token(user: AuthUserResponse, channel: AuthChannel) -> str:
        return create_access_token(
            {
                "kind": "user_session",
                "sub": user.id,
                "email": user.email,
                "roles": user.roles,
                "channel": channel.value,
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
