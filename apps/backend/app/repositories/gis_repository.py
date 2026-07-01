"""
GIS repository for PostGIS-backed operational queries.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class GisRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def nearby(
        self,
        *,
        latitud: float,
        longitud: float,
        radio_metros: int,
        limit: int,
    ) -> list[dict[str, Any]]:
        statement = text(
            """
            WITH origen AS (
                SELECT ST_SetSRID(ST_MakePoint(:longitud, :latitud), 4326)::geography AS geog
            ),
            incidentes AS (
                SELECT
                    'incidente'::text AS tipo,
                    i.id::text,
                    i.codigo,
                    i.titulo,
                    i.estado::text,
                    i.severidad::text,
                    ST_Y(i.geom)::float AS latitud,
                    ST_X(i.geom)::float AS longitud,
                    ST_Distance(i.geom::geography, origen.geog)::float AS distancia_metros
                FROM sc_incidentes.incidente i, origen
                WHERE i.deleted_at IS NULL
                  AND i.geom IS NOT NULL
                  AND ST_DWithin(i.geom::geography, origen.geog, :radio_metros)
            ),
            alertas AS (
                SELECT
                    'alerta'::text AS tipo,
                    a.id::text,
                    a.codigo,
                    a.titulo,
                    a.estado::text,
                    a.severidad::text,
                    ST_Y(a.geom)::float AS latitud,
                    ST_X(a.geom)::float AS longitud,
                    ST_Distance(a.geom::geography, origen.geog)::float AS distancia_metros
                FROM sc_alertas.alerta a, origen
                WHERE a.geom IS NOT NULL
                  AND a.estado IN ('ACTIVA', 'ENVIADA')
                  AND ST_DWithin(a.geom::geography, origen.geog, :radio_metros)
            ),
            ubicaciones AS (
                SELECT
                    'ubicacion'::text AS tipo,
                    u.id::text,
                    u.codigo,
                    u.nombre AS titulo,
                    NULL::text AS estado,
                    NULL::text AS severidad,
                    u.latitud::float,
                    u.longitud::float,
                    ST_Distance(
                        ST_SetSRID(ST_MakePoint(u.longitud, u.latitud), 4326)::geography,
                        origen.geog
                    )::float AS distancia_metros
                FROM sc_maestros.ubicacion_maestra u, origen
                WHERE u.activa IS TRUE
                  AND ST_DWithin(
                        ST_SetSRID(ST_MakePoint(u.longitud, u.latitud), 4326)::geography,
                        origen.geog,
                        :radio_metros
                  )
            )
            SELECT * FROM incidentes
            UNION ALL SELECT * FROM alertas
            UNION ALL SELECT * FROM ubicaciones
            ORDER BY distancia_metros ASC
            LIMIT :limit;
            """
        )
        result = await self.db.execute(
            statement,
            {
                "latitud": latitud,
                "longitud": longitud,
                "radio_metros": radio_metros,
                "limit": limit,
            },
        )
        return [dict(row) for row in result.mappings()]

    async def heatmap(self, *, tipo: str, limit: int) -> list[dict[str, Any]]:
        if tipo == "alertas":
            statement = text(
                """
                SELECT
                    'alerta'::text AS tipo,
                    ST_Y(geom)::float AS latitud,
                    ST_X(geom)::float AS longitud,
                    CASE severidad
                        WHEN 'CRITICO' THEN 1.0
                        WHEN 'ALTO' THEN 0.75
                        WHEN 'MEDIO' THEN 0.45
                        ELSE 0.25
                    END::float AS peso,
                    1 AS total
                FROM sc_alertas.alerta
                WHERE geom IS NOT NULL
                ORDER BY created_at DESC
                LIMIT :limit;
                """
            )
        else:
            statement = text(
                """
                SELECT
                    'incidente'::text AS tipo,
                    ST_Y(geom)::float AS latitud,
                    ST_X(geom)::float AS longitud,
                    CASE severidad
                        WHEN 'CRITICO' THEN 1.0
                        WHEN 'ALTO' THEN 0.75
                        WHEN 'MEDIO' THEN 0.45
                        ELSE 0.25
                    END::float AS peso,
                    1 AS total
                FROM sc_incidentes.incidente
                WHERE deleted_at IS NULL AND geom IS NOT NULL
                ORDER BY created_at DESC
                LIMIT :limit;
                """
            )
        result = await self.db.execute(statement, {"limit": limit})
        return [dict(row) for row in result.mappings()]

    async def route_between_locations(
        self, *, origen_id: str, destino_id: str
    ) -> dict[str, Any] | None:
        statement = text(
            """
            SELECT
                o.id::text AS origen_id,
                d.id::text AS destino_id,
                o.nombre AS origen_nombre,
                d.nombre AS destino_nombre,
                o.latitud::float AS origen_latitud,
                o.longitud::float AS origen_longitud,
                d.latitud::float AS destino_latitud,
                d.longitud::float AS destino_longitud,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(o.longitud, o.latitud), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(d.longitud, d.latitud), 4326)::geography
                )::float AS distancia_metros
            FROM sc_maestros.ubicacion_maestra o
            JOIN sc_maestros.ubicacion_maestra d ON d.id = :destino_id
            WHERE o.id = :origen_id
              AND o.activa IS TRUE
              AND d.activa IS TRUE
            LIMIT 1;
            """
        )
        result = await self.db.execute(
            statement,
            {"origen_id": origen_id, "destino_id": destino_id},
        )
        row = result.mappings().one_or_none()
        return dict(row) if row else None
