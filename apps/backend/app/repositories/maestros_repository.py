from typing import Any
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sc_maestros import UbicacionMaestra


class MaestrosRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_ubicaciones(self, include_inactive: bool = False) -> list[dict[str, Any]]:
        statement = select(UbicacionMaestra).order_by(UbicacionMaestra.nombre.asc())
        if not include_inactive:
            statement = statement.where(UbicacionMaestra.activa.is_(True))
        result = await self.db.execute(statement)
        return [
            {
                "id": str(row.id),
                "codigo": row.codigo,
                "nombre": row.nombre,
                "latitud": float(row.latitud),
                "longitud": float(row.longitud),
                "activa": row.activa,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in result.scalars()
        ]

    async def create_ubicacion(self, data: dict[str, Any]) -> dict[str, Any]:
        row = UbicacionMaestra(**data)
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return {
            "id": str(row.id),
            "codigo": row.codigo,
            "nombre": row.nombre,
            "latitud": float(row.latitud),
            "longitud": float(row.longitud),
            "activa": row.activa,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    async def update_ubicacion(self, ubicacion_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
        statement = (
            update(UbicacionMaestra)
            .where(UbicacionMaestra.id == UUID(ubicacion_id))
            .values(**data)
            .returning(UbicacionMaestra)
        )
        result = await self.db.execute(statement)
        row = result.scalar_one_or_none()
        if not row:
            return None
        return {
            "id": str(row.id),
            "codigo": row.codigo,
            "nombre": row.nombre,
            "latitud": float(row.latitud),
            "longitud": float(row.longitud),
            "activa": row.activa,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    async def delete_ubicacion(self, ubicacion_id: str) -> bool:
        statement = (
            delete(UbicacionMaestra)
            .where(UbicacionMaestra.id == UUID(ubicacion_id))
            .returning(UbicacionMaestra.id)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none() is not None
