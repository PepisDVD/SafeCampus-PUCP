from fastapi import APIRouter, Query

from app.schemas.incidente import IncidenteListResponse
from app.services.incidente_service import IncidenteService

router = APIRouter()


@router.get("/", response_model=IncidenteListResponse)
async def listar_incidentes(limit: int = Query(default=20, ge=1, le=100)):
    service = IncidenteService()
    items = await service.listar_recentes(limit=limit)
    return IncidenteListResponse(items=items, total=len(items))
