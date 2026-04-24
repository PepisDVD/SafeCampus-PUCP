"""
📁 apps/backend/app/api/deps.py
🎯 Dependencias inyectables compartidas: sesión de BD, usuario actual, verificación de roles.
📦 Capa: API / Dependencias
"""

from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.database import get_db


bearer_scheme = HTTPBearer(auto_error=False)


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    """Alias para inyección de sesión de BD."""
    return db


def get_access_token(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Debes autenticarte con Bearer token")
    token = credentials.credentials.strip()
    if not token:
        raise UnauthorizedError("Token de acceso vacio")
    return token


# TODO: Implementar dependencias de autenticación
# async def get_current_user(...) -> Usuario:
# async def require_role(roles: list[str]) -> ...:
