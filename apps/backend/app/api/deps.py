"""
📁 apps/backend/app/api/deps.py
🎯 Dependencias inyectables compartidas: sesión de BD, usuario actual, verificación de roles.
📦 Capa: API / Dependencias
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    """Alias para inyección de sesión de BD."""
    return db


# TODO: Implementar dependencias de autenticación
# async def get_current_user(...) -> Usuario:
# async def require_role(roles: list[str]) -> ...:
