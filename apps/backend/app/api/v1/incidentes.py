from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_access_token, get_session
from app.core.constants import EstadoIncidente, TipoCanal
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.incidente_repository import IncidenteRepository
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.incidente import (
    IncidenteCreateRequest,
    IncidenteCreateResponse,
    IncidenteDetailResponse,
    IncidenteListResponse,
)
from app.services.incidente_service import IncidenteService

router = APIRouter()


def _service(db: AsyncSession) -> IncidenteService:
    return IncidenteService(
        repository=IncidenteRepository(db),
        user_repository=UserSyncRepository(db),
        auth_client=SupabaseAuthClient(),
    )


@router.get("/", response_model=IncidenteListResponse)
async def listar_incidentes(
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    estado: EstadoIncidente | None = Query(default=None),
    canal_origen: TipoCanal | None = Query(default=None),
    mine: bool = Query(default=False),
):
    return await _service(db).list_incidentes(
        access_token=access_token,
        limit=limit,
        search=search,
        estado=estado,
        canal_origen=canal_origen,
        mine=mine,
    )


@router.post("/", response_model=IncidenteCreateResponse)
async def registrar_incidente(
    payload: IncidenteCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    forwarded_for = request.headers.get("x-forwarded-for")
    ip_origen = forwarded_for.split(",", maxsplit=1)[0].strip() if forwarded_for else None
    return await _service(db).registrar_incidente(
        access_token=access_token,
        payload=payload,
        ip_origen=ip_origen,
        user_agent=request.headers.get("user-agent"),
    )


@router.get("/{incidente_id}", response_model=IncidenteDetailResponse)
async def obtener_incidente(
    incidente_id: str,
    db: AsyncSession = Depends(get_session),
    access_token: str = Depends(get_access_token),
):
    return await _service(db).get_incidente(
        access_token=access_token,
        incidente_id=incidente_id,
    )
