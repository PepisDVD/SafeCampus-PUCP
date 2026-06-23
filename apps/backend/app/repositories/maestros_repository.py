from typing import Any
from uuid import UUID

from sqlalchemy import delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sc_maestros import UbicacionMaestra

# Columnas FK que referencian a sc_maestros.ubicacion_maestra desde otras
# entidades del sistema. Una ubicación con registros aquí no puede eliminarse.
_REFERENCIAS_UBICACION: tuple[tuple[str, str], ...] = (
    ("sc_alertas.alerta", "zona_id"),
    ("sc_alertas.alerta_segmento", "ubicacion_id"),
    ("sc_alertas.punto_interes", "ubicacion_maestra_id"),
)


def _serialize(row: UbicacionMaestra, *, tiene_relaciones: bool = False) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "codigo": row.codigo,
        "nombre": row.nombre,
        "tipo": row.tipo,
        "latitud": float(row.latitud),
        "longitud": float(row.longitud),
        "activa": row.activa,
        "tiene_relaciones": tiene_relaciones,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


class MaestrosRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def referenced_ubicacion_ids(self) -> set[str]:
        """IDs de ubicaciones referenciadas por cualquier otra entidad."""
        union_sql = " UNION ".join(
            f"SELECT {column} AS id FROM {table} WHERE {column} IS NOT NULL"
            for table, column in _REFERENCIAS_UBICACION
        )
        result = await self.db.execute(text(union_sql))
        return {str(value) for (value,) in result.all()}

    async def ubicacion_tiene_relaciones(self, ubicacion_id: str) -> bool:
        exists_sql = " UNION ALL ".join(
            f"SELECT 1 FROM {table} WHERE {column} = :ubicacion_id"
            for table, column in _REFERENCIAS_UBICACION
        )
        result = await self.db.execute(
            text(f"SELECT EXISTS ({exists_sql})"),
            {"ubicacion_id": UUID(ubicacion_id)},
        )
        return bool(result.scalar())

    async def list_ubicaciones(self, include_inactive: bool = False) -> list[dict[str, Any]]:
        statement = select(UbicacionMaestra).order_by(UbicacionMaestra.nombre.asc())
        if not include_inactive:
            statement = statement.where(UbicacionMaestra.activa.is_(True))
        result = await self.db.execute(statement)
        referenced = await self.referenced_ubicacion_ids()
        return [
            _serialize(row, tiene_relaciones=str(row.id) in referenced)
            for row in result.scalars()
        ]

    async def create_ubicacion(self, data: dict[str, Any]) -> dict[str, Any]:
        row = UbicacionMaestra(**data)
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return _serialize(row, tiene_relaciones=False)

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
        tiene_relaciones = await self.ubicacion_tiene_relaciones(ubicacion_id)
        return _serialize(row, tiene_relaciones=tiene_relaciones)

    async def delete_ubicacion(self, ubicacion_id: str) -> bool:
        statement = (
            delete(UbicacionMaestra)
            .where(UbicacionMaestra.id == UUID(ubicacion_id))
            .returning(UbicacionMaestra.id)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none() is not None
