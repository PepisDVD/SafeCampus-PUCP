"""
REST endpoints for GIS operations.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session, require_roles
from app.schemas.alerta import GisHeatmapResponse, GisNearbyResponse, GisRouteResponse
from app.schemas.auth import AuthUserResponse
from app.services.gis_service import GisService

router = APIRouter()
OPERATIVO_ROLES = {"administrador", "supervisor", "operador"}


def get_service(db: AsyncSession = Depends(get_session)) -> GisService:
    return GisService(db)


@router.get("/proximidad", response_model=GisNearbyResponse)
async def consultar_proximidad(
    latitud: float = Query(ge=-90, le=90),
    longitud: float = Query(ge=-180, le=180),
    radio_metros: int = Query(default=300, ge=1, le=5000),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: GisService = Depends(get_service),
) -> GisNearbyResponse:
    return await service.proximidad(
        latitud=latitud,
        longitud=longitud,
        radio_metros=radio_metros,
        limit=limit,
        actor_id=current_user.id,
    )


@router.get("/heatmap", response_model=GisHeatmapResponse)
async def consultar_heatmap(
    tipo: str = Query(default="incidentes", pattern="^(incidentes|alertas)$"),
    limit: int = Query(default=500, ge=1, le=1000),
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: GisService = Depends(get_service),
) -> GisHeatmapResponse:
    return await service.heatmap(tipo=tipo, limit=limit, actor_id=current_user.id)


@router.get("/rutas", response_model=GisRouteResponse)
async def calcular_ruta(
    origen_id: str,
    destino_id: str,
    current_user: AuthUserResponse = Depends(require_roles(OPERATIVO_ROLES)),
    service: GisService = Depends(get_service),
) -> GisRouteResponse:
    return await service.ruta(
        origen_id=origen_id,
        destino_id=destino_id,
        actor_id=current_user.id,
    )
