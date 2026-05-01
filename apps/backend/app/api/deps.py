"""
Shared FastAPI dependencies for database sessions and authorization.
"""

from collections.abc import AsyncGenerator, Callable

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.schemas.auth import AuthUserResponse
from app.services.auth_service import AuthService


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    session_token: str | None = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
    db: AsyncSession = Depends(get_session),
) -> AuthUserResponse:
    return await AuthService(db).get_user_from_session_token(session_token)


def require_roles(roles: set[str]) -> Callable[..., AuthUserResponse]:
    async def dependency(
        current_user: AuthUserResponse = Depends(get_current_user),
    ) -> AuthUserResponse:
        if not roles.intersection(current_user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a este recurso.",
            )
        return current_user

    return dependency
