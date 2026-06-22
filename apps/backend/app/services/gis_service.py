"""
Business logic for GIS operational queries.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.gis_repository import GisRepository
from app.schemas.alerta import (
    GisHeatmapPoint,
    GisHeatmapResponse,
    GisNearbyItem,
    GisNearbyResponse,
    GisRouteResponse,
)


class GisService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = GisRepository(db)

    async def proximidad(
        self,
        *,
        latitud: float,
        longitud: float,
        radio_metros: int,
        limit: int,
        actor_id: str,
    ) -> GisNearbyResponse:
        rows = await self._repo.nearby(
            latitud=latitud,
            longitud=longitud,
            radio_metros=max(1, min(radio_metros, 5000)),
            limit=max(1, min(limit, 100)),
        )
        return GisNearbyResponse(
            items=[
                GisNearbyItem(
                    tipo=str(row["tipo"]),
                    id=str(row["id"]),
                    codigo=row.get("codigo"),
                    titulo=str(row["titulo"]),
                    estado=row.get("estado"),
                    severidad=row.get("severidad"),
                    latitud=float(row["latitud"]),
                    longitud=float(row["longitud"]),
                    distancia_metros=round(float(row["distancia_metros"]), 1),
                )
                for row in rows
            ],
            total=len(rows),
        )

    async def heatmap(self, *, tipo: str, limit: int, actor_id: str) -> GisHeatmapResponse:
        tipo_norm = tipo if tipo in {"incidentes", "alertas"} else "incidentes"
        rows = await self._repo.heatmap(tipo=tipo_norm, limit=max(1, min(limit, 1000)))
        return GisHeatmapResponse(
            points=[
                GisHeatmapPoint(
                    tipo=str(row["tipo"]),
                    latitud=float(row["latitud"]),
                    longitud=float(row["longitud"]),
                    peso=float(row["peso"]),
                    total=int(row["total"]),
                )
                for row in rows
            ],
            total=len(rows),
        )

    async def ruta(self, *, origen_id: str, destino_id: str, actor_id: str) -> GisRouteResponse:
        self._validate_uuid(origen_id)
        self._validate_uuid(destino_id)
        row = await self._repo.route_between_locations(origen_id=origen_id, destino_id=destino_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruta no encontrada.")
        return GisRouteResponse(
            origen_id=row["origen_id"],
            destino_id=row["destino_id"],
            origen_nombre=row["origen_nombre"],
            destino_nombre=row["destino_nombre"],
            distancia_metros=round(float(row["distancia_metros"]), 1),
            puntos=[
                {"latitud": float(row["origen_latitud"]), "longitud": float(row["origen_longitud"])},
                {"latitud": float(row["destino_latitud"]), "longitud": float(row["destino_longitud"])},
            ],
        )

    @staticmethod
    def _validate_uuid(value: str) -> None:
        try:
            UUID(value)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID invalido.") from exc
