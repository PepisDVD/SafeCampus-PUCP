"""
Create or update a development community user for local/LAN PWA testing.

This script is intentionally idempotent:
- If the user exists, it updates the password and profile basics.
- If the user does not exist, it creates it.
- In both cases, it ensures the "comunidad" role is assigned.
"""

from __future__ import annotations

import asyncio
import os

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.models.sc_users import Rol, Usuario, UsuarioRol

DEV_EMAIL = os.getenv("DEV_COMMUNITY_EMAIL", "safecampus.comunidad.dev@gmail.com")
DEV_PASSWORD = os.getenv("DEV_COMMUNITY_PASSWORD", "SafeCampusDev123!")
DEV_FIRST_NAME = os.getenv("DEV_COMMUNITY_FIRST_NAME", "Comunidad")
DEV_LAST_NAME = os.getenv("DEV_COMMUNITY_LAST_NAME", "Dev")


async def main() -> None:
    password_hash = get_password_hash(DEV_PASSWORD)

    async with AsyncSessionLocal() as session:
        role_result = await session.execute(
            select(Rol.id).where(func.lower(Rol.nombre) == "comunidad").limit(1)
        )
        role_id = role_result.scalar_one_or_none()
        if role_id is None:
            role_id = settings.DEFAULT_COMMUNITY_ROLE_ID

        user_result = await session.execute(
            select(Usuario.id).where(func.lower(Usuario.email) == DEV_EMAIL.lower()).limit(1)
        )
        user_id = user_result.scalar_one_or_none()

        if user_id is None:
            statement = (
                insert(Usuario)
                .values(
                    email=DEV_EMAIL,
                    nombre=DEV_FIRST_NAME,
                    apellido=DEV_LAST_NAME,
                    password_hash=password_hash,
                    estado="ACTIVO",
                    email_verificado=True,
                    auth_provider="credentials",
                    departamento="Desarrollo",
                )
                .returning(Usuario.id)
            )
            result = await session.execute(statement)
            user_id = result.scalar_one()
            action = "creado"
        else:
            statement = (
                update(Usuario)
                .where(Usuario.id == user_id)
                .values(
                    nombre=DEV_FIRST_NAME,
                    apellido=DEV_LAST_NAME,
                    password_hash=password_hash,
                    estado="ACTIVO",
                    email_verificado=True,
                    auth_provider="credentials",
                    departamento="Desarrollo",
                    deleted_at=None,
                    updated_at=func.now(),
                )
            )
            await session.execute(statement)
            action = "actualizado"

        await session.execute(
            insert(UsuarioRol)
            .values(usuario_id=user_id, rol_id=role_id)
            .on_conflict_do_nothing(index_elements=[UsuarioRol.usuario_id, UsuarioRol.rol_id])
        )
        await session.commit()

    await engine.dispose()

    print(f"Usuario comunidad dev {action}:")
    print(f"  email: {DEV_EMAIL}")
    print(f"  password: {DEV_PASSWORD}")
    print("  rol: comunidad")


if __name__ == "__main__":
    asyncio.run(main())
