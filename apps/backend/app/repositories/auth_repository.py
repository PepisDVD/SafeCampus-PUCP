"""
Repository for backend-owned auth using normalized SQLAlchemy schema models.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sc_users import Rol, Usuario, UsuarioRol


class AuthRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def upsert_oauth_user(self, data: dict[str, Any]) -> dict[str, Any]:
        auth_user_id = UUID(str(data["auth_user_id"]))
        statement = (
            insert(Usuario)
            .values(
                email=data["email"],
                nombre=data["nombre"],
                apellido=data["apellido"],
                password_hash=None,
                avatar_url=data["avatar_url"],
                estado="ACTIVO",
                email_verificado=data["email_verificado"],
                auth_provider=data["auth_provider"],
                auth_user_id=auth_user_id,
                ultimo_acceso=func.now(),
            )
            .on_conflict_do_update(
                index_elements=[Usuario.email],
                set_={
                    "auth_user_id": auth_user_id,
                    "auth_provider": data["auth_provider"],
                    "avatar_url": func.coalesce(data["avatar_url"], Usuario.avatar_url),
                    "email_verificado": data["email_verificado"],
                    "ultimo_acceso": func.now(),
                    "updated_at": func.now(),
                },
            )
            .returning(
                Usuario.id,
                Usuario.email,
                Usuario.nombre,
                Usuario.apellido,
                Usuario.avatar_url,
            )
        )
        result = await self.db.execute(statement)
        return dict(result.mappings().one())

    async def get_role_id_by_name(self, role_name: str) -> str | None:
        statement = (
            select(Rol.id)
            .where(func.lower(Rol.nombre) == role_name.lower())
            .limit(1)
        )
        role_id = await self.db.scalar(statement)
        return str(role_id) if role_id else None

    async def assign_role(self, usuario_id: str, rol_id: str) -> None:
        statement = (
            insert(UsuarioRol)
            .values(usuario_id=UUID(usuario_id), rol_id=UUID(rol_id))
            .on_conflict_do_nothing(
                index_elements=[UsuarioRol.usuario_id, UsuarioRol.rol_id],
            )
        )
        await self.db.execute(statement)

    async def list_role_names(self, usuario_id: str) -> list[str]:
        statement = (
            select(Rol.nombre)
            .join(UsuarioRol, UsuarioRol.rol_id == Rol.id)
            .where(UsuarioRol.usuario_id == UUID(usuario_id))
            .order_by(Rol.nombre)
        )
        result = await self.db.execute(statement)
        return [str(row[0]) for row in result]

    async def get_user_profile(self, usuario_id: str) -> dict[str, Any] | None:
        statement = (
            select(
                Usuario.id,
                Usuario.email,
                Usuario.nombre,
                Usuario.apellido,
                Usuario.avatar_url,
                Usuario.estado,
            )
            .where(Usuario.id == UUID(usuario_id), Usuario.deleted_at.is_(None))
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None
