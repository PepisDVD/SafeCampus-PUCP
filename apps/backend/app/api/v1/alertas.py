"""
REST endpoints for campus alerts.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session, require_roles
from app.core.constants import EstadoAlertaCampus, NivelSeveridad
from app.schemas.alerta import (
    AlertaCreateInput,
    AlertaDetail,
    AlertaEstadoInput,
    AlertaListResponse,
    AlertaPublishResponse,
    AlertaUpdateInput,
    AlertasStatsResponse,
)
from app.schemas.auth import AuthUserResponse
from app.services.alerta_service import AlertaService

router = APIRouter()
OPERATIVO_ROLES = {"administrador", "supervisor", "operador"}


def get_service(db: AsyncSession = Depends(get_session)) -> AlertaService:
    return AlertaService(db)


@router.get("/", response_model=AlertaListResponse)
async def listar_alertas(
    search: str | None = Query(default=None),
    estado: EstadoAlertaCampus | None = Query(default=None),
    severidad: NivelSeveridad | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.listar(
        search=search,
        estado=estado.value if estado else None,
        severidad=severidad.value if severidad else None,
        limit=limit,
    )


@router.get("/stats", response_model=AlertasStatsResponse)
async def obtener_stats_alertas(
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.stats()


@router.post("/", response_model=AlertaDetail, status_code=201)
async def crear_alerta(
    body: AlertaCreateInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.crear(body=body, actor_id=current_user.id)


@router.get("/{alerta_id}", response_model=AlertaDetail)
async def obtener_alerta(
    alerta_id: str,
    _user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.obtener(alerta_id)


@router.patch("/{alerta_id}", response_model=AlertaDetail)
async def actualizar_alerta(
    alerta_id: str,
    body: AlertaUpdateInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.actualizar(alerta_id=alerta_id, body=body, actor_id=current_user.id)


@router.post("/{alerta_id}/publicar", response_model=AlertaPublishResponse)
async def publicar_alerta(
    alerta_id: str,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.publicar(alerta_id=alerta_id, actor_id=current_user.id)


@router.post("/{alerta_id}/cancelar", response_model=AlertaDetail)
async def cancelar_alerta(
    alerta_id: str,
    body: AlertaEstadoInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.cancelar(
        alerta_id=alerta_id,
        actor_id=current_user.id,
        comentario=body.comentario,
    )


@router.post("/{alerta_id}/finalizar", response_model=AlertaDetail)
async def finalizar_alerta(
    alerta_id: str,
    body: AlertaEstadoInput,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: AlertaService = Depends(get_service),
):
    return await service.finalizar(
        alerta_id=alerta_id,
        actor_id=current_user.id,
        comentario=body.comentario,
    )
