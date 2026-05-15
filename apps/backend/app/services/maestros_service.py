from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.maestros_repository import MaestrosRepository
from app.schemas.maestros import (
    UbicacionMaestraCreateInput,
    UbicacionMaestraItem,
    UbicacionMaestraUpdateInput,
)


class MaestrosService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = MaestrosRepository(db)

    async def listar_ubicaciones(self, include_inactive: bool = False) -> list[UbicacionMaestraItem]:
        rows = await self._repo.list_ubicaciones(include_inactive=include_inactive)
        return [UbicacionMaestraItem(**row) for row in rows]

    async def crear_ubicacion(self, data: UbicacionMaestraCreateInput) -> UbicacionMaestraItem:
        payload = {
            "codigo": data.codigo.strip().upper(),
            "nombre": data.nombre.strip(),
            "latitud": data.latitud,
            "longitud": data.longitud,
            "activa": data.activa,
        }
        try:
            row = await self._repo.create_ubicacion(payload)
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una ubicacion con el mismo codigo o nombre.",
            ) from exc
        return UbicacionMaestraItem(**row)

    async def actualizar_ubicacion(
        self,
        ubicacion_id: str,
        data: UbicacionMaestraUpdateInput,
    ) -> UbicacionMaestraItem:
        payload = {
            "codigo": data.codigo.strip().upper(),
            "nombre": data.nombre.strip(),
            "latitud": data.latitud,
            "longitud": data.longitud,
            "activa": data.activa,
        }
        try:
            row = await self._repo.update_ubicacion(ubicacion_id, payload)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de ubicacion invalido.") from exc
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una ubicacion con el mismo codigo o nombre.",
            ) from exc
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicacion no encontrada.")
        return UbicacionMaestraItem(**row)

    async def eliminar_ubicacion(self, ubicacion_id: str) -> None:
        try:
            deleted = await self._repo.delete_ubicacion(ubicacion_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de ubicacion invalido.") from exc
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicacion no encontrada.")
