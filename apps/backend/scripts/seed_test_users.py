"""
Seed 25 test users with credentials for QA/development scenarios.

The script is intentionally idempotent:
- Existing users are updated by email.
- Missing users are created.
- The user's seeded role is replaced with the role declared below.

Default password for every seeded account:
  SafeCampus2026!

Override it with:
  SEED_TEST_USERS_PASSWORD="NewPassword123!" python scripts/seed_test_users.py
"""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Literal

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert

from app.core.database import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.models.sc_users import Rol, Usuario, UsuarioRol

SeedRole = Literal["operador", "supervisor", "comunidad"]

DEFAULT_PASSWORD = os.getenv("SEED_TEST_USERS_PASSWORD", "SafeCampus2026!")


@dataclass(frozen=True)
class SeedUser:
    email: str
    nombre: str
    apellido: str
    role: SeedRole
    departamento: str
    codigo_institucional: str | None = None


SEED_USERS: tuple[SeedUser, ...] = (
    SeedUser("andrea.ramos.seguridad@gmail.com", "Andrea", "Ramos", "operador", "Seguridad"),
    SeedUser("bruno.silva.operaciones@gmail.com", "Bruno", "Silva", "operador", "Seguridad"),
    SeedUser("camila.torres.campus@gmail.com", "Camila", "Torres", "operador", "Seguridad"),
    SeedUser("diego.mendoza.guardia@gmail.com", "Diego", "Mendoza", "operador", "Seguridad"),
    SeedUser("elena.vargas.monitoreo@gmail.com", "Elena", "Vargas", "operador", "Seguridad"),
    SeedUser("fernando.quispe.turno@gmail.com", "Fernando", "Quispe", "operador", "Seguridad"),
    SeedUser("gabriela.nunez.alertas@gmail.com", "Gabriela", "Nunez", "operador", "Seguridad"),
    SeedUser("hector.paredes.ronda@gmail.com", "Hector", "Paredes", "operador", "Seguridad"),
    SeedUser("irene.castillo.control@gmail.com", "Irene", "Castillo", "operador", "Seguridad"),
    SeedUser("jorge.salinas.operador@gmail.com", "Jorge", "Salinas", "operador", "Seguridad"),
    SeedUser(
        "karla.benavides.supervision@gmail.com", "Karla", "Benavides", "supervisor", "Seguridad"
    ),
    SeedUser("luis.cardenas.coordinacion@gmail.com", "Luis", "Cardenas", "supervisor", "Seguridad"),
    SeedUser("mariana.vera.respuesta@gmail.com", "Mariana", "Vera", "supervisor", "Seguridad"),
    SeedUser(
        "nicolas.herrera.incidencias@gmail.com", "Nicolas", "Herrera", "supervisor", "Seguridad"
    ),
    SeedUser("paola.rios.campus@gmail.com", "Paola", "Rios", "supervisor", "Seguridad"),
    SeedUser(
        "alvaro.munoz@pucp.edu.pe",
        "Alvaro",
        "Munoz",
        "comunidad",
        "Estudios Generales Letras",
        "20260001",
    ),
    SeedUser(
        "beatriz.lopez@pucp.edu.pe", "Beatriz", "Lopez", "comunidad", "Ingenieria", "20260002"
    ),
    SeedUser(
        "cesar.romero@pucp.edu.pe", "Cesar", "Romero", "comunidad", "Ciencias Sociales", "20260003"
    ),
    SeedUser(
        "daniela.flores@pucp.edu.pe", "Daniela", "Flores", "comunidad", "Arquitectura", "20260004"
    ),
    SeedUser("emilio.garcia@pucp.edu.pe", "Emilio", "Garcia", "comunidad", "Derecho", "20260005"),
    SeedUser(
        "fatima.chavez@pucp.edu.pe", "Fatima", "Chavez", "comunidad", "Comunicaciones", "20260006"
    ),
    SeedUser("gustavo.ortiz@pucp.edu.pe", "Gustavo", "Ortiz", "comunidad", "Gestion", "20260007"),
    SeedUser("helena.soto@pucp.edu.pe", "Helena", "Soto", "comunidad", "Arte y Diseno", "20260008"),
    SeedUser(
        "ivan.reyes@pucp.edu.pe", "Ivan", "Reyes", "comunidad", "Ciencias e Ingenieria", "20260009"
    ),
    SeedUser(
        "juliana.morales@pucp.edu.pe", "Juliana", "Morales", "comunidad", "Educacion", "20260010"
    ),
)


async def get_role_ids() -> dict[SeedRole, object]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Rol.id, func.lower(Rol.nombre).label("nombre")).where(
                func.lower(Rol.nombre).in_(("operador", "supervisor", "comunidad"))
            )
        )
        role_ids = {str(row.nombre): row.id for row in result}

    missing_roles = sorted({"operador", "supervisor", "comunidad"} - set(role_ids))
    if missing_roles:
        raise RuntimeError(
            "No se encontraron roles requeridos en sc_users.rol: " + ", ".join(missing_roles)
        )
    return role_ids  # type: ignore[return-value]


async def upsert_seed_user(user: SeedUser, password_hash: str, role_id: object) -> str:
    async with AsyncSessionLocal() as session:
        existing = await session.execute(
            select(Usuario.id).where(func.lower(Usuario.email) == user.email.lower()).limit(1)
        )
        user_id = existing.scalar_one_or_none()

        values = {
            "email": user.email,
            "nombre": user.nombre,
            "apellido": user.apellido,
            "codigo_institucional": user.codigo_institucional,
            "password_hash": password_hash,
            "estado": "ACTIVO",
            "email_verificado": True,
            "auth_provider": "credentials",
            "auth_user_id": None,
            "departamento": user.departamento,
            "deleted_at": None,
            "updated_at": func.now(),
        }

        if user_id is None:
            result = await session.execute(insert(Usuario).values(**values).returning(Usuario.id))
            user_id = result.scalar_one()
            action = "creado"
        else:
            await session.execute(update(Usuario).where(Usuario.id == user_id).values(**values))
            action = "actualizado"

        await session.execute(delete(UsuarioRol).where(UsuarioRol.usuario_id == user_id))
        await session.execute(
            insert(UsuarioRol)
            .values(usuario_id=user_id, rol_id=role_id)
            .on_conflict_do_nothing(index_elements=[UsuarioRol.usuario_id, UsuarioRol.rol_id])
        )
        await session.commit()
        return action


async def main() -> None:
    role_ids = await get_role_ids()
    password_hash = get_password_hash(DEFAULT_PASSWORD)
    counters = {"creado": 0, "actualizado": 0}

    for user in SEED_USERS:
        action = await upsert_seed_user(user, password_hash, role_ids[user.role])
        counters[action] += 1

    await engine.dispose()

    print("Seed de usuarios de prueba completado.")
    print(f"  total: {len(SEED_USERS)}")
    print(f"  creados: {counters['creado']}")
    print(f"  actualizados: {counters['actualizado']}")
    print(f"  password: {DEFAULT_PASSWORD}")
    print("  roles: 10 operador, 5 supervisor, 10 comunidad")


if __name__ == "__main__":
    asyncio.run(main())
