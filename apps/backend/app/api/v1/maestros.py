from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session, require_roles
from app.schemas.auth import AuthUserResponse
from app.schemas.maestros import (
    UbicacionMaestraCreateInput,
    UbicacionMaestraItem,
    UbicacionMaestraUpdateInput,
)
from app.services.maestros_service import MaestrosService

router = APIRouter()
ADMIN_ROLES = {"administrador"}


def get_service(db: AsyncSession = Depends(get_session)) -> MaestrosService:
    return MaestrosService(db)


@router.get("/ubicaciones", response_model=list[UbicacionMaestraItem])
async def listar_ubicaciones(
    include_inactive: bool = Query(default=False),
    _user: AuthUserResponse = Depends(get_current_user),
    service: MaestrosService = Depends(get_service),
) -> list[UbicacionMaestraItem]:
    return await service.listar_ubicaciones(include_inactive=include_inactive)


@router.post(
    "/ubicaciones", response_model=UbicacionMaestraItem, status_code=status.HTTP_201_CREATED
)
async def crear_ubicacion(
    body: UbicacionMaestraCreateInput,
    _user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: MaestrosService = Depends(get_service),
) -> UbicacionMaestraItem:
    return await service.crear_ubicacion(body)


@router.patch("/ubicaciones/{ubicacion_id}", response_model=UbicacionMaestraItem)
async def actualizar_ubicacion(
    ubicacion_id: str,
    body: UbicacionMaestraUpdateInput,
    _user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: MaestrosService = Depends(get_service),
) -> UbicacionMaestraItem:
    return await service.actualizar_ubicacion(ubicacion_id, body)


@router.delete("/ubicaciones/{ubicacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_ubicacion(
    ubicacion_id: str,
    _user: AuthUserResponse = Depends(require_roles(ADMIN_ROLES)),
    service: MaestrosService = Depends(get_service),
) -> None:
    await service.eliminar_ubicacion(ubicacion_id)
