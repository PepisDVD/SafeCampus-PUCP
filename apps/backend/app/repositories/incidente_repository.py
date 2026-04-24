from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import EstadoIncidente, EstadoReporte, NivelSeveridad, TipoCanal
from app.schemas.incidente import EvidenciaCreate


class IncidenteRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_active_channel_id(self, canal_origen: TipoCanal) -> str | None:
        result = await self._db.execute(
            text(
                """
                SELECT id
                FROM sc_omnicanal.canal_reporte
                WHERE tipo = CAST(:tipo AS tipo_canal)
                  AND activo IS TRUE
                ORDER BY created_at ASC
                LIMIT 1
                """,
            ),
            {"tipo": canal_origen.value},
        )
        value = result.scalar_one_or_none()
        return str(value) if value else None

    async def insert_reporte_entrante(
        self,
        *,
        canal_id: str,
        contenido_raw: str,
        metadatos_canal: dict[str, Any],
        ip_origen: str | None,
        user_agent: str | None,
    ) -> dict[str, Any]:
        result = await self._db.execute(
            text(
                """
                INSERT INTO sc_omnicanal.reporte_entrante (
                    canal_id,
                    contenido_raw,
                    metadatos_canal,
                    estado,
                    ip_origen,
                    user_agent
                )
                VALUES (
                    CAST(:canal_id AS uuid),
                    :contenido_raw,
                    CAST(:metadatos_canal AS jsonb),
                    'RECIBIDO',
                    CAST(:ip_origen AS inet),
                    :user_agent
                )
                RETURNING id, fecha_recepcion
                """,
            ),
            {
                "canal_id": canal_id,
                "contenido_raw": contenido_raw,
                "metadatos_canal": json.dumps(metadatos_canal),
                "ip_origen": ip_origen,
                "user_agent": user_agent,
            },
        )
        row = result.mappings().one()
        return dict(row)

    async def update_reporte_estado(
        self,
        *,
        reporte_id: str,
        estado: EstadoReporte,
        incidente_id: str | None = None,
        es_correlacionado: bool | None = None,
    ) -> None:
        await self._db.execute(
            text(
                """
                UPDATE sc_omnicanal.reporte_entrante
                SET
                    estado = CAST(:estado AS estado_reporte),
                    incidente_id = COALESCE(CAST(:incidente_id AS uuid), incidente_id),
                    es_correlacionado = COALESCE(:es_correlacionado, es_correlacionado),
                    updated_at = NOW()
                WHERE id = CAST(:reporte_id AS uuid)
                """,
            ),
            {
                "reporte_id": reporte_id,
                "estado": estado.value,
                "incidente_id": incidente_id,
                "es_correlacionado": es_correlacionado,
            },
        )

    async def find_incident_by_correlation_id(self, correlation_id: str) -> dict[str, Any] | None:
        result = await self._db.execute(
            text(
                """
                SELECT
                    i.id,
                    i.codigo,
                    i.estado,
                    i.canal_origen,
                    i.created_at
                FROM sc_omnicanal.reporte_entrante re
                JOIN sc_incidentes.incidente i ON i.id = re.incidente_id
                WHERE re.metadatos_canal ->> 'correlation_id' = :correlation_id
                  AND re.incidente_id IS NOT NULL
                ORDER BY re.fecha_recepcion ASC
                LIMIT 1
                """,
            ),
            {"correlation_id": correlation_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def find_related_incident(
        self,
        *,
        categoria: str | None,
        ubicacion_texto: str | None,
        latitud: float | None,
        longitud: float | None,
    ) -> dict[str, Any] | None:
        result = await self._db.execute(
            text(
                """
                SELECT
                    id,
                    codigo,
                    estado,
                    canal_origen,
                    created_at
                FROM sc_incidentes.incidente
                WHERE deleted_at IS NULL
                  AND estado NOT IN ('RESUELTO', 'CERRADO')
                  AND created_at >= NOW() - INTERVAL '30 minutes'
                  AND (
                    (
                      :ubicacion_texto IS NOT NULL
                      AND lugar_referencia IS NOT NULL
                      AND lower(lugar_referencia) = lower(:ubicacion_texto)
                    )
                    OR (
                      :latitud IS NOT NULL
                      AND :longitud IS NOT NULL
                      AND geom IS NOT NULL
                      AND ST_DWithin(
                        geom::geography,
                        ST_SetSRID(ST_MakePoint(:longitud, :latitud), 4326)::geography,
                        60
                      )
                    )
                  )
                  AND (:categoria IS NULL OR categoria = :categoria)
                ORDER BY created_at DESC
                LIMIT 1
                """,
            ),
            {
                "categoria": categoria,
                "ubicacion_texto": ubicacion_texto,
                "latitud": latitud,
                "longitud": longitud,
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def next_incident_code(self, today: datetime) -> str:
        prefix = f"INC-{today:%Y%m%d}-"
        result = await self._db.execute(
            text(
                """
                SELECT codigo
                FROM sc_incidentes.incidente
                WHERE codigo LIKE :prefix_like
                ORDER BY codigo DESC
                LIMIT 1
                FOR UPDATE
                """,
            ),
            {"prefix_like": f"{prefix}%"},
        )
        last_code = result.scalar_one_or_none()
        next_number = 1
        if last_code:
            try:
                next_number = int(str(last_code).rsplit("-", maxsplit=1)[1]) + 1
            except (IndexError, ValueError):
                next_number = 1
        return f"{prefix}{next_number:05d}"

    async def create_incidente(
        self,
        *,
        codigo: str,
        titulo: str,
        descripcion: str,
        canal_origen: TipoCanal,
        reportante_id: str,
        categoria: str | None,
        severidad: NivelSeveridad | None,
        ubicacion_texto: str | None,
        latitud: float | None,
        longitud: float | None,
    ) -> dict[str, Any]:
        result = await self._db.execute(
            text(
                """
                INSERT INTO sc_incidentes.incidente (
                    codigo,
                    titulo,
                    descripcion,
                    estado,
                    severidad,
                    categoria,
                    canal_origen,
                    geom,
                    lugar_referencia,
                    reportante_id
                )
                VALUES (
                    :codigo,
                    :titulo,
                    :descripcion,
                    'RECIBIDO',
                    CAST(:severidad AS nivel_severidad),
                    :categoria,
                    CAST(:canal_origen AS tipo_canal),
                    CASE
                      WHEN :latitud IS NULL OR :longitud IS NULL THEN NULL
                      ELSE ST_SetSRID(ST_MakePoint(:longitud, :latitud), 4326)
                    END,
                    :ubicacion_texto,
                    CAST(:reportante_id AS uuid)
                )
                RETURNING id, codigo, estado, canal_origen, created_at
                """,
            ),
            {
                "codigo": codigo,
                "titulo": titulo,
                "descripcion": descripcion,
                "severidad": severidad.value if severidad else None,
                "categoria": categoria,
                "canal_origen": canal_origen.value,
                "ubicacion_texto": ubicacion_texto,
                "latitud": latitud,
                "longitud": longitud,
                "reportante_id": reportante_id,
            },
        )
        return dict(result.mappings().one())

    async def insert_historial(
        self,
        *,
        incidente_id: str,
        estado_anterior: EstadoIncidente | None,
        estado_nuevo: EstadoIncidente,
        accion: str,
        comentario: str | None,
        ejecutado_por_id: str,
    ) -> None:
        await self._db.execute(
            text(
                """
                INSERT INTO sc_incidentes.historial_incidente (
                    incidente_id,
                    estado_anterior,
                    estado_nuevo,
                    accion,
                    comentario,
                    ejecutado_por_id
                )
                VALUES (
                    CAST(:incidente_id AS uuid),
                    CAST(:estado_anterior AS estado_incidente),
                    CAST(:estado_nuevo AS estado_incidente),
                    :accion,
                    :comentario,
                    CAST(:ejecutado_por_id AS uuid)
                )
                """,
            ),
            {
                "incidente_id": incidente_id,
                "estado_anterior": estado_anterior.value if estado_anterior else None,
                "estado_nuevo": estado_nuevo.value,
                "accion": accion,
                "comentario": comentario,
                "ejecutado_por_id": ejecutado_por_id,
            },
        )

    async def insert_evidencias(
        self,
        *,
        incidente_id: str,
        evidencias: list[EvidenciaCreate],
        cargado_por_id: str,
    ) -> None:
        for evidencia in evidencias:
            await self._db.execute(
                text(
                    """
                    INSERT INTO sc_incidentes.evidencia (
                        incidente_id,
                        tipo_archivo,
                        nombre_archivo,
                        url_archivo,
                        tamano_bytes,
                        mime_type,
                        descripcion,
                        cargado_por_id
                    )
                    VALUES (
                        CAST(:incidente_id AS uuid),
                        :tipo_archivo,
                        :nombre_archivo,
                        :url_archivo,
                        :tamano_bytes,
                        :mime_type,
                        :descripcion,
                        CAST(:cargado_por_id AS uuid)
                    )
                    """,
                ),
                {
                    "incidente_id": incidente_id,
                    "tipo_archivo": evidencia.tipo_archivo,
                    "nombre_archivo": evidencia.nombre_archivo,
                    "url_archivo": evidencia.url_archivo,
                    "tamano_bytes": evidencia.tamano_bytes,
                    "mime_type": evidencia.mime_type,
                    "descripcion": evidencia.descripcion,
                    "cargado_por_id": cargado_por_id,
                },
            )

    async def insert_ubicacion(
        self,
        *,
        incidente_id: str,
        latitud: float,
        longitud: float,
        fuente: str,
        precision_metros: float | None,
        altitud: float | None,
        descripcion: str | None,
    ) -> None:
        await self._db.execute(
            text(
                """
                INSERT INTO sc_incidentes.ubicacion_incidente (
                    incidente_id,
                    geom,
                    fuente,
                    precision_metros,
                    altitud,
                    descripcion
                )
                VALUES (
                    CAST(:incidente_id AS uuid),
                    ST_SetSRID(ST_MakePoint(:longitud, :latitud), 4326),
                    :fuente,
                    :precision_metros,
                    :altitud,
                    :descripcion
                )
                """,
            ),
            {
                "incidente_id": incidente_id,
                "latitud": latitud,
                "longitud": longitud,
                "fuente": fuente,
                "precision_metros": precision_metros,
                "altitud": altitud,
                "descripcion": descripcion,
            },
        )

    async def insert_audit_log(
        self,
        *,
        usuario_id: str | None,
        accion: str,
        entidad_id: str | None,
        detalle: dict[str, Any],
        ip_origen: str | None,
        dispositivo: str | None,
    ) -> None:
        await self._db.execute(
            text(
                """
                INSERT INTO sc_auditoria.registro_auditoria (
                    usuario_id,
                    accion,
                    modulo,
                    entidad,
                    entidad_id,
                    detalle,
                    ip_origen,
                    dispositivo
                )
                VALUES (
                    CAST(:usuario_id AS uuid),
                    :accion,
                    'incidentes',
                    'incidente',
                    CAST(:entidad_id AS uuid),
                    CAST(:detalle AS jsonb),
                    CAST(:ip_origen AS inet),
                    :dispositivo
                )
                """,
            ),
            {
                "usuario_id": usuario_id,
                "accion": accion,
                "entidad_id": entidad_id,
                "detalle": json.dumps(detalle),
                "ip_origen": ip_origen,
                "dispositivo": dispositivo,
            },
        )

    async def list_incidentes(
        self,
        *,
        limit: int,
        search: str | None,
        estado: EstadoIncidente | None,
        canal_origen: TipoCanal | None,
        reportante_id: str | None,
    ) -> list[dict[str, Any]]:
        result = await self._db.execute(
            text(
                """
                SELECT
                    i.id,
                    i.codigo,
                    i.titulo,
                    i.descripcion,
                    i.estado,
                    i.severidad,
                    i.categoria,
                    i.lugar_referencia AS zona,
                    i.canal_origen,
                    concat_ws(' ', rep.nombre, rep.apellido) AS reportante_nombre,
                    concat_ws(' ', op.nombre, op.apellido) AS operador_nombre,
                    i.created_at AS fecha_registro
                FROM sc_incidentes.incidente i
                JOIN sc_users.usuario rep ON rep.id = i.reportante_id
                LEFT JOIN sc_users.usuario op ON op.id = i.operador_asignado_id
                WHERE i.deleted_at IS NULL
                  AND (:estado IS NULL OR i.estado = CAST(:estado AS estado_incidente))
                  AND (:canal_origen IS NULL OR i.canal_origen = CAST(:canal_origen AS tipo_canal))
                  AND (:reportante_id IS NULL OR i.reportante_id = CAST(:reportante_id AS uuid))
                  AND (
                    :search IS NULL
                    OR i.codigo ILIKE :search_like
                    OR i.titulo ILIKE :search_like
                    OR i.descripcion ILIKE :search_like
                  )
                ORDER BY i.created_at DESC
                LIMIT :limit
                """,
            ),
            {
                "limit": limit,
                "search": search,
                "search_like": f"%{search}%" if search else None,
                "estado": estado.value if estado else None,
                "canal_origen": canal_origen.value if canal_origen else None,
                "reportante_id": reportante_id,
            },
        )
        return [dict(row) for row in result.mappings().all()]

    async def get_incidente_detail(self, incidente_id: str) -> dict[str, Any] | None:
        result = await self._db.execute(
            text(
                """
                SELECT
                    i.id,
                    i.codigo,
                    i.titulo,
                    i.descripcion,
                    i.estado,
                    i.severidad,
                    i.categoria,
                    i.lugar_referencia AS zona,
                    i.lugar_referencia,
                    i.canal_origen,
                    i.reportante_id,
                    i.operador_asignado_id,
                    i.supervisor_id,
                    i.es_anonimo,
                    concat_ws(' ', rep.nombre, rep.apellido) AS reportante_nombre,
                    concat_ws(' ', op.nombre, op.apellido) AS operador_nombre,
                    i.created_at AS fecha_registro,
                    i.updated_at
                FROM sc_incidentes.incidente i
                JOIN sc_users.usuario rep ON rep.id = i.reportante_id
                LEFT JOIN sc_users.usuario op ON op.id = i.operador_asignado_id
                WHERE i.id = CAST(:incidente_id AS uuid)
                  AND i.deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"incidente_id": incidente_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def list_historial(self, incidente_id: str) -> list[dict[str, Any]]:
        result = await self._db.execute(
            text(
                """
                SELECT
                    h.id,
                    h.estado_anterior,
                    h.estado_nuevo,
                    h.accion,
                    h.comentario,
                    concat_ws(' ', u.nombre, u.apellido) AS ejecutado_por_nombre,
                    h.created_at
                FROM sc_incidentes.historial_incidente h
                LEFT JOIN sc_users.usuario u ON u.id = h.ejecutado_por_id
                WHERE h.incidente_id = CAST(:incidente_id AS uuid)
                ORDER BY h.created_at ASC
                """,
            ),
            {"incidente_id": incidente_id},
        )
        return [dict(row) for row in result.mappings().all()]

    async def list_evidencias(self, incidente_id: str) -> list[dict[str, Any]]:
        result = await self._db.execute(
            text(
                """
                SELECT
                    id,
                    tipo_archivo,
                    nombre_archivo,
                    url_archivo,
                    mime_type,
                    descripcion,
                    created_at
                FROM sc_incidentes.evidencia
                WHERE incidente_id = CAST(:incidente_id AS uuid)
                ORDER BY created_at ASC
                """,
            ),
            {"incidente_id": incidente_id},
        )
        return [dict(row) for row in result.mappings().all()]

    async def list_ubicaciones(self, incidente_id: str) -> list[dict[str, Any]]:
        result = await self._db.execute(
            text(
                """
                SELECT
                    id,
                    descripcion,
                    fuente,
                    ST_Y(geom) AS latitud,
                    ST_X(geom) AS longitud,
                    precision_metros,
                    created_at
                FROM sc_incidentes.ubicacion_incidente
                WHERE incidente_id = CAST(:incidente_id AS uuid)
                ORDER BY created_at ASC
                """,
            ),
            {"incidente_id": incidente_id},
        )
        return [dict(row) for row in result.mappings().all()]
