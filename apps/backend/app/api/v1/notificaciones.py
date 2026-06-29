"""
Endpoints REST para notificaciones internas de la PWA.
"""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.schemas.auth import AuthUserResponse
from app.schemas.notificacion import (
    NotificacionListResponse,
    NotificacionUnreadCount,
)
from app.services.notificacion_service import NotificacionService

router = APIRouter()


def get_service(db: AsyncSession = Depends(get_session)) -> NotificacionService:
    return NotificacionService(db)


@router.get("/", response_model=NotificacionListResponse)
async def listar_notificaciones(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    current_user: AuthUserResponse = Depends(get_current_user),
    service: NotificacionService = Depends(get_service),
) -> NotificacionListResponse:
    return await service.listar(
        current_user.id,
        unread_only=unread_only,
        limit=limit,
    )


@router.get("/no-leidas", response_model=NotificacionUnreadCount)
async def contar_no_leidas(
    current_user: AuthUserResponse = Depends(get_current_user),
    service: NotificacionService = Depends(get_service),
) -> NotificacionUnreadCount:
    return await service.contar_no_leidas(current_user.id)


@router.patch("/leer-todas", response_model=NotificacionUnreadCount)
async def marcar_todas_leidas(
    current_user: AuthUserResponse = Depends(get_current_user),
    service: NotificacionService = Depends(get_service),
) -> NotificacionUnreadCount:
    return await service.marcar_todas_leidas(current_user.id)


@router.patch("/{notificacion_id}/leer", status_code=status.HTTP_204_NO_CONTENT)
async def marcar_leida(
    notificacion_id: str,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: NotificacionService = Depends(get_service),
) -> Response:
    await service.marcar_leida(current_user.id, notificacion_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
