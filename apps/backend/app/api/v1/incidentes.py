"""
📁 apps/backend/app/api/v1/incidentes.py
🎯 Endpoints REST del módulo de incidentes.
📦 Capa: API
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.schemas.auth import AuthUserResponse
from app.schemas.incidente import (
    IncidenteCreated,
    IncidenteCreateInput,
    IncidenteListResponse,
)
from app.services.incidente_service import IncidenteService

router = APIRouter()


def get_service(db: AsyncSession = Depends(get_session)) -> IncidenteService:
    return IncidenteService(db)


@router.get("/", response_model=IncidenteListResponse)
async def listar_incidentes(
    limit: int = Query(default=20, ge=1, le=100),
    service: IncidenteService = Depends(get_service),
):
    """Listado general de incidentes (vista operativa)."""
    items = await service.listar_recentes(limit=limit)
    return IncidenteListResponse(items=items, total=len(items))


@router.get("/mis", response_model=IncidenteListResponse)
async def listar_mis_incidentes(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
):
    """Listado de incidentes reportados por el usuario autenticado (PWA Comunidad)."""
    items = await service.listar_mis_incidentes(
        usuario_id=current_user.id,
        limit=limit,
    )
    return IncidenteListResponse(items=items, total=len(items))


@router.post(
    "/",
    response_model=IncidenteCreated,
    status_code=status.HTTP_201_CREATED,
)
async def crear_incidente(
    body: IncidenteCreateInput,
    current_user: AuthUserResponse = Depends(get_current_user),
    service: IncidenteService = Depends(get_service),
):
    """Crea un nuevo incidente reportado por el usuario autenticado."""
    return await service.crear_incidente(
        reportante_id=current_user.id,
        data=body,
    )