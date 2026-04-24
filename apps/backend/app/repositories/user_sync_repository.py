from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class UserSyncRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def find_user_by_auth_user_id(self, auth_user_id: str) -> dict[str, Any] | None:
        query = text(
            """
            SELECT id, email
            FROM sc_users.usuario
                        WHERE auth_user_id = CAST(:auth_user_id AS uuid)
              AND deleted_at IS NULL
            LIMIT 1
            """,
        )
        result = await self._db.execute(query, {"auth_user_id": auth_user_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        query = text(
            """
            SELECT id, email
            FROM sc_users.usuario
            WHERE email = :email
              AND deleted_at IS NULL
            LIMIT 1
            """,
        )
        result = await self._db.execute(query, {"email": email})
        row = result.mappings().first()
        return dict(row) if row else None

    async def create_user(
        self,
        *,
        auth_user_id: str,
        email: str,
        nombre: str,
        apellido: str,
        email_verificado: bool,
        avatar_url: str | None,
        provider: str | None,
    ) -> str:
        query = text(
            """
            INSERT INTO sc_users.usuario (
                auth_user_id,
                auth_provider,
                email,
                nombre,
                apellido,
                avatar_url,
                email_verificado,
                password_hash,
                estado,
                ultimo_acceso
            )
            VALUES (
                CAST(:auth_user_id AS uuid),
                :auth_provider,
                :email,
                :nombre,
                :apellido,
                :avatar_url,
                :email_verificado,
                NULL,
                'ACTIVO',
                NOW()
            )
            RETURNING id
            """,
        )
        result = await self._db.execute(
            query,
            {
                "auth_user_id": auth_user_id,
                "auth_provider": provider,
                "email": email,
                "nombre": nombre,
                "apellido": apellido,
                "avatar_url": avatar_url,
                "email_verificado": email_verificado,
            },
        )
        return str(result.scalar_one())

    async def update_user(
        self,
        *,
        user_id: str,
        auth_user_id: str,
        email: str,
        nombre: str,
        apellido: str,
        email_verificado: bool,
        avatar_url: str | None,
        provider: str | None,
    ) -> None:
        query = text(
            """
            UPDATE sc_users.usuario
            SET
                auth_user_id = CAST(:auth_user_id AS uuid),
                auth_provider = COALESCE(:auth_provider, auth_provider),
                email = :email,
                nombre = :nombre,
                apellido = :apellido,
                avatar_url = COALESCE(:avatar_url, avatar_url),
                email_verificado = :email_verificado,
                ultimo_acceso = NOW(),
                updated_at = NOW()
            WHERE id = CAST(:user_id AS uuid)
            """,
        )
        await self._db.execute(
            query,
            {
                "user_id": user_id,
                "auth_user_id": auth_user_id,
                "auth_provider": provider,
                "email": email,
                "nombre": nombre,
                "apellido": apellido,
                "avatar_url": avatar_url,
                "email_verificado": email_verificado,
            },
        )

    async def list_role_names(self, user_id: str) -> list[str]:
        query = text(
            """
            SELECT r.nombre
            FROM sc_users.usuario_rol ur
            JOIN sc_users.rol r ON r.id = ur.rol_id
            WHERE ur.usuario_id = CAST(:user_id AS uuid)
            ORDER BY r.nombre ASC
            """,
        )
        result = await self._db.execute(query, {"user_id": user_id})
        return [str(name) for name in result.scalars().all()]

    async def assign_role_if_missing(self, *, user_id: str, role_id: UUID) -> None:
        query = text(
            """
            INSERT INTO sc_users.usuario_rol (usuario_id, rol_id)
                        SELECT CAST(:user_id AS uuid), CAST(:role_id AS uuid)
            WHERE NOT EXISTS (
                SELECT 1
                FROM sc_users.usuario_rol
                                WHERE usuario_id = CAST(:user_id AS uuid)
                                    AND rol_id = CAST(:role_id AS uuid)
            )
            """,
        )
        await self._db.execute(
            query,
            {
                "user_id": user_id,
                "role_id": str(role_id),
            },
        )

    async def insert_session(
        self,
        *,
        user_id: str,
        token_hash: str,
        ip_origen: str | None,
        user_agent: str | None,
        fecha_expiracion: datetime,
    ) -> None:
        query = text(
            """
            INSERT INTO sc_users.sesion (
                usuario_id,
                token_hash,
                ip_origen,
                user_agent,
                estado,
                fecha_expiracion
            )
            VALUES (
                CAST(:user_id AS uuid),
                :token_hash,
                CAST(:ip_origen AS inet),
                :user_agent,
                'ACTIVA',
                :fecha_expiracion
            )
            """,
        )
        await self._db.execute(
            query,
            {
                "user_id": user_id,
                "token_hash": token_hash,
                "ip_origen": ip_origen,
                "user_agent": user_agent,
                "fecha_expiracion": fecha_expiracion,
            },
        )
