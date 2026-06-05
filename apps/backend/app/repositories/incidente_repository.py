"""
📁 apps/backend/app/repositories/incidente_repository.py
🎯 Repositorio de incidentes — consultas SQLAlchemy contra sc_incidentes.incidente.
📦 Capa: Repositorios
"""

from datetime import datetime, time, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.constants import INCIDENT_CODE_PREFIX
from app.models.sc_clasificacion import ClasificacionIa
from app.models.sc_incidentes import (
    ComentarioIncidente,
    Evidencia,
    ExpedienteCierre,
    HistorialIncidente,
    Incidente,
)
from app.models.sc_users import Rol, Usuario, UsuarioRol


class IncidenteRepository:
    """Acceso a datos para incidentes (lectura y creación)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Lectura
    # ------------------------------------------------------------------

    def _base_select(self):
        operador_nombre = func.nullif(
            func.trim(
                func.concat(
                    func.coalesce(Usuario.nombre, ""),
                    " ",
                    func.coalesce(Usuario.apellido, ""),
                )
            ),
            "",
        ).label("operador_nombre")

        return (
            select(
                Incidente.id,
                Incidente.codigo,
                Incidente.titulo,
                Incidente.descripcion,
                Incidente.estado,
                Incidente.severidad,
                Incidente.categoria,
                Incidente.lugar_referencia,
                func.ST_Y(Incidente.geom).label("latitud"),
                func.ST_X(Incidente.geom).label("longitud"),
                Incidente.canal_origen,
                Incidente.created_at,
                operador_nombre,
                Usuario.avatar_url.label("operador_avatar_url"),
            )
            .outerjoin(Usuario, Usuario.id == Incidente.operador_asignado_id)
            .where(Incidente.deleted_at.is_(None))
        )

    async def list_recentes(
        self,
        *,
        search: str | None = None,
        severidad: str | None = None,
        estado: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        statement = self._base_select()

        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    Incidente.codigo.ilike(pattern),
                    Incidente.titulo.ilike(pattern),
                )
            )
        if severidad:
            statement = statement.where(Incidente.severidad == severidad)
        if estado:
            statement = statement.where(Incidente.estado == estado)

        statement = statement.order_by(Incidente.created_at.desc()).limit(limit)
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_detail_by_id(
        self,
        incidente_id: str,
    ) -> dict[str, Any] | None:
        """Detalle completo de un incidente con joins a reportante / operador / supervisor."""
        Reportante = aliased(Usuario, name="reportante")
        Operador = aliased(Usuario, name="operador")
        Supervisor = aliased(Usuario, name="supervisor")

        statement = (
            select(
                Incidente.id,
                Incidente.codigo,
                Incidente.titulo,
                Incidente.descripcion,
                Incidente.estado,
                Incidente.severidad,
                Incidente.categoria,
                Incidente.lugar_referencia,
                func.ST_Y(Incidente.geom).label("latitud"),
                func.ST_X(Incidente.geom).label("longitud"),
                Incidente.canal_origen,
                Incidente.fecha_primera_respuesta,
                Incidente.fecha_resolucion,
                Incidente.created_at,
                Incidente.updated_at,
                Incidente.reportante_id,
                Reportante.nombre.label("reportante_nombre"),
                Reportante.apellido.label("reportante_apellido"),
                Reportante.email.label("reportante_email"),
                Reportante.avatar_url.label("reportante_avatar_url"),
                Incidente.operador_asignado_id,
                Operador.nombre.label("operador_nombre"),
                Operador.apellido.label("operador_apellido"),
                Operador.email.label("operador_email"),
                Operador.avatar_url.label("operador_avatar_url"),
                Incidente.supervisor_id,
                Supervisor.nombre.label("supervisor_nombre"),
                Supervisor.apellido.label("supervisor_apellido"),
                Supervisor.email.label("supervisor_email"),
                Supervisor.avatar_url.label("supervisor_avatar_url"),
            )
            .outerjoin(Reportante, Reportante.id == Incidente.reportante_id)
            .outerjoin(Operador, Operador.id == Incidente.operador_asignado_id)
            .outerjoin(Supervisor, Supervisor.id == Incidente.supervisor_id)
            .where(
                Incidente.id == UUID(incidente_id),
                Incidente.deleted_at.is_(None),
            )
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def get_detail_by_code_or_id_for_reportante(
        self,
        incidente_ref: str,
        reportante_id: str,
    ) -> dict[str, Any] | None:
        """Detalle de un incidente propio de comunidad, por codigo o UUID."""
        Reportante = aliased(Usuario, name="reportante")
        Operador = aliased(Usuario, name="operador")
        Supervisor = aliased(Usuario, name="supervisor")

        filters = [
            Incidente.reportante_id == UUID(reportante_id),
            Incidente.deleted_at.is_(None),
        ]
        try:
            filters.append(Incidente.id == UUID(incidente_ref))
        except ValueError:
            filters.append(Incidente.codigo == incidente_ref)

        statement = (
            select(
                Incidente.id,
                Incidente.codigo,
                Incidente.titulo,
                Incidente.descripcion,
                Incidente.estado,
                Incidente.severidad,
                Incidente.categoria,
                Incidente.lugar_referencia,
                func.ST_Y(Incidente.geom).label("latitud"),
                func.ST_X(Incidente.geom).label("longitud"),
                Incidente.canal_origen,
                Incidente.fecha_primera_respuesta,
                Incidente.fecha_resolucion,
                Incidente.created_at,
                Incidente.updated_at,
                Incidente.reportante_id,
                Reportante.nombre.label("reportante_nombre"),
                Reportante.apellido.label("reportante_apellido"),
                Reportante.email.label("reportante_email"),
                Reportante.avatar_url.label("reportante_avatar_url"),
                Incidente.operador_asignado_id,
                Operador.nombre.label("operador_nombre"),
                Operador.apellido.label("operador_apellido"),
                Operador.email.label("operador_email"),
                Operador.avatar_url.label("operador_avatar_url"),
                Incidente.supervisor_id,
                Supervisor.nombre.label("supervisor_nombre"),
                Supervisor.apellido.label("supervisor_apellido"),
                Supervisor.email.label("supervisor_email"),
                Supervisor.avatar_url.label("supervisor_avatar_url"),
            )
            .outerjoin(Reportante, Reportante.id == Incidente.reportante_id)
            .outerjoin(Operador, Operador.id == Incidente.operador_asignado_id)
            .outerjoin(Supervisor, Supervisor.id == Incidente.supervisor_id)
            .where(*filters)
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def list_historial(
        self,
        incidente_id: str,
    ) -> list[dict[str, Any]]:
        """Eventos de historial ordenados cronológicamente, con info del ejecutor."""
        statement = (
            select(
                HistorialIncidente.id,
                HistorialIncidente.estado_anterior,
                HistorialIncidente.estado_nuevo,
                HistorialIncidente.accion,
                HistorialIncidente.comentario,
                HistorialIncidente.created_at,
                HistorialIncidente.ejecutado_por_id,
                Usuario.nombre.label("ejecutor_nombre"),
                Usuario.apellido.label("ejecutor_apellido"),
                Usuario.email.label("ejecutor_email"),
                Usuario.avatar_url.label("ejecutor_avatar_url"),
            )
            .outerjoin(Usuario, Usuario.id == HistorialIncidente.ejecutado_por_id)
            .where(HistorialIncidente.incidente_id == UUID(incidente_id))
            .order_by(HistorialIncidente.created_at.asc())
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_mapa(
        self,
        *,
        severidad: str | None = None,
        estado: str | None = None,
        activos_only: bool = True,
        limit: int = 300,
    ) -> list[dict[str, Any]]:
        statement = (
            select(
                Incidente.id,
                Incidente.codigo,
                Incidente.titulo,
                Incidente.estado,
                Incidente.severidad,
                Incidente.categoria,
                Incidente.lugar_referencia,
                func.ST_Y(Incidente.geom).label("latitud"),
                func.ST_X(Incidente.geom).label("longitud"),
                Incidente.created_at,
            )
            .where(Incidente.deleted_at.is_(None))
            .order_by(Incidente.created_at.desc())
            .limit(limit)
        )
        if severidad:
            statement = statement.where(Incidente.severidad == severidad)
        if estado:
            statement = statement.where(Incidente.estado == estado)
        if activos_only:
            statement = statement.where(
                Incidente.estado.notin_(("RESUELTO", "CERRADO"))
            )

        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_comentarios(
        self,
        incidente_id: str,
        *,
        include_internal: bool = False,
    ) -> list[dict[str, Any]]:
        statement = (
            select(
                ComentarioIncidente.id,
                ComentarioIncidente.incidente_id,
                ComentarioIncidente.autor_id,
                ComentarioIncidente.contenido,
                ComentarioIncidente.es_interno,
                ComentarioIncidente.created_at,
                ComentarioIncidente.updated_at,
                Usuario.nombre.label("autor_nombre"),
                Usuario.apellido.label("autor_apellido"),
                Usuario.email.label("autor_email"),
                Usuario.avatar_url.label("autor_avatar_url"),
            )
            .outerjoin(Usuario, Usuario.id == ComentarioIncidente.autor_id)
            .where(ComentarioIncidente.incidente_id == UUID(incidente_id))
            .order_by(ComentarioIncidente.created_at.asc())
        )
        if not include_internal:
            statement = statement.where(ComentarioIncidente.es_interno.is_(False))

        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_evidencias(self, incidente_id: str) -> list[dict[str, Any]]:
        statement = (
            select(
                Evidencia.id,
                Evidencia.incidente_id,
                Evidencia.tipo_archivo,
                Evidencia.nombre_archivo,
                Evidencia.url_archivo,
                Evidencia.tamano_bytes,
                Evidencia.mime_type,
                Evidencia.descripcion,
                Evidencia.cargado_por_id,
                Evidencia.created_at,
                Usuario.nombre.label("cargado_por_nombre"),
                Usuario.apellido.label("cargado_por_apellido"),
                Usuario.email.label("cargado_por_email"),
                Usuario.avatar_url.label("cargado_por_avatar_url"),
            )
            .outerjoin(Usuario, Usuario.id == Evidencia.cargado_por_id)
            .where(Evidencia.incidente_id == UUID(incidente_id))
            .order_by(Evidencia.created_at.asc())
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_expediente_cierre(
        self,
        incidente_id: str,
    ) -> dict[str, Any] | None:
        statement = (
            select(
                ExpedienteCierre.id,
                ExpedienteCierre.incidente_id,
                ExpedienteCierre.resumen_cierre,
                ExpedienteCierre.resultado,
                ExpedienteCierre.snapshot,
                ExpedienteCierre.generado_por_id,
                ExpedienteCierre.pdf_url,
                ExpedienteCierre.created_at,
                ExpedienteCierre.updated_at,
                Usuario.nombre.label("generado_por_nombre"),
                Usuario.apellido.label("generado_por_apellido"),
                Usuario.email.label("generado_por_email"),
                Usuario.avatar_url.label("generado_por_avatar_url"),
            )
            .outerjoin(Usuario, Usuario.id == ExpedienteCierre.generado_por_id)
            .where(ExpedienteCierre.incidente_id == UUID(incidente_id))
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def create_comentario(
        self,
        incidente_id: str,
        autor_id: str,
        contenido: str,
        *,
        es_interno: bool = False,
    ) -> dict[str, Any]:
        comentario = ComentarioIncidente(
            incidente_id=UUID(incidente_id),
            autor_id=UUID(autor_id),
            contenido=contenido,
            es_interno=es_interno,
        )
        self.db.add(comentario)
        await self.db.flush()
        await self.db.refresh(comentario)
        return {
            "id": comentario.id,
            "incidente_id": comentario.incidente_id,
            "autor_id": comentario.autor_id,
            "contenido": comentario.contenido,
            "es_interno": comentario.es_interno,
            "created_at": comentario.created_at,
            "updated_at": comentario.updated_at,
        }

    async def create_evidencia(
        self,
        *,
        incidente_id: str,
        tipo_archivo: str,
        nombre_archivo: str,
        url_archivo: str,
        tamano_bytes: int | None,
        mime_type: str | None,
        descripcion: str | None,
        cargado_por_id: str,
    ) -> dict[str, Any]:
        evidencia = Evidencia(
            incidente_id=UUID(incidente_id),
            tipo_archivo=tipo_archivo,
            nombre_archivo=nombre_archivo,
            url_archivo=url_archivo,
            tamano_bytes=tamano_bytes,
            mime_type=mime_type,
            descripcion=descripcion,
            cargado_por_id=UUID(cargado_por_id),
        )
        self.db.add(evidencia)
        await self.db.flush()
        await self.db.refresh(evidencia)
        return {
            "id": evidencia.id,
            "incidente_id": evidencia.incidente_id,
            "tipo_archivo": evidencia.tipo_archivo,
            "nombre_archivo": evidencia.nombre_archivo,
            "url_archivo": evidencia.url_archivo,
            "tamano_bytes": evidencia.tamano_bytes,
            "mime_type": evidencia.mime_type,
            "descripcion": evidencia.descripcion,
            "cargado_por_id": evidencia.cargado_por_id,
            "created_at": evidencia.created_at,
        }

    async def upsert_expediente_cierre(
        self,
        *,
        incidente_id: str,
        resumen_cierre: str,
        resultado: str | None,
        snapshot: dict[str, Any],
        generado_por_id: str,
    ) -> dict[str, Any]:
        statement = (
            insert(ExpedienteCierre)
            .values(
                incidente_id=UUID(incidente_id),
                resumen_cierre=resumen_cierre,
                resultado=resultado,
                snapshot=snapshot,
                generado_por_id=UUID(generado_por_id),
            )
            .on_conflict_do_update(
                index_elements=[ExpedienteCierre.incidente_id],
                set_={
                    "resumen_cierre": resumen_cierre,
                    "resultado": resultado,
                    "snapshot": snapshot,
                    "generado_por_id": UUID(generado_por_id),
                    "updated_at": func.now(),
                },
            )
            .returning(ExpedienteCierre.id)
        )
        result = await self.db.execute(statement)
        return {"id": result.scalar_one()}

    async def get_participantes(self, incidente_id: str) -> dict[str, Any] | None:
        statement = (
            select(
                Incidente.id,
                Incidente.codigo,
                Incidente.titulo,
                Incidente.estado,
                Incidente.reportante_id,
                Incidente.operador_asignado_id,
                Incidente.supervisor_id,
            )
            .where(
                Incidente.id == UUID(incidente_id),
                Incidente.deleted_at.is_(None),
            )
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def list_usuarios_by_roles(self, roles: set[str]) -> list[dict[str, Any]]:
        statement = (
            select(Usuario.id)
            .join(UsuarioRol, UsuarioRol.usuario_id == Usuario.id)
            .join(Rol, Rol.id == UsuarioRol.rol_id)
            .where(
                Usuario.deleted_at.is_(None),
                Usuario.estado == "ACTIVO",
                func.lower(Rol.nombre).in_({r.lower() for r in roles}),
            )
            .distinct()
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_stats(self) -> dict[str, int]:
        """Métricas agregadas en una sola consulta (counts con FILTER)."""
        cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        statement = select(
            func.count().label("total"),
            func.count()
            .filter(Incidente.estado.notin_(("RESUELTO", "CERRADO")))
            .label("activos"),
            func.count()
            .filter(Incidente.severidad == "CRITICO")
            .label("criticos"),
            func.count()
            .filter(Incidente.estado == "EN_ATENCION")
            .label("en_atencion"),
            func.count()
            .filter(
                and_(
                    Incidente.estado == "RESUELTO",
                    Incidente.fecha_resolucion >= cutoff_24h,
                )
            )
            .label("resueltos_24h"),
        ).where(Incidente.deleted_at.is_(None))

        result = await self.db.execute(statement)
        row = result.mappings().one()
        return {
            "total": int(row["total"] or 0),
            "activos": int(row["activos"] or 0),
            "criticos": int(row["criticos"] or 0),
            "en_atencion": int(row["en_atencion"] or 0),
            "resueltos_24h": int(row["resueltos_24h"] or 0),
        }

    async def get_period_aggregates(
        self,
        start: datetime,
        end: datetime,
    ) -> dict[str, Any]:
        """Agregados de un rango de fechas en una sola query.

        Devuelve total, resueltos, criticos, escalados, FRT/TMR promedio
        (en minutos) y conteo de incidentes con FRT <= 5 min.
        """
        epoch_frt = func.extract(
            "epoch",
            Incidente.fecha_primera_respuesta - Incidente.created_at,
        )
        epoch_tmr = func.extract(
            "epoch",
            Incidente.fecha_resolucion - Incidente.created_at,
        )

        statement = select(
            func.count().label("total"),
            func.count()
            .filter(Incidente.estado.in_(("RESUELTO", "CERRADO")))
            .label("resueltos"),
            func.count()
            .filter(Incidente.severidad == "CRITICO")
            .label("criticos"),
            func.count().filter(Incidente.estado == "ESCALADO").label("escalados"),
            (func.avg(epoch_frt).filter(Incidente.fecha_primera_respuesta.is_not(None)) / 60.0)
            .label("frt_min"),
            (func.avg(epoch_tmr).filter(Incidente.fecha_resolucion.is_not(None)) / 60.0)
            .label("tmr_min"),
            func.count()
            .filter(
                Incidente.fecha_primera_respuesta.is_not(None),
                epoch_frt <= 5 * 60,
            )
            .label("frt_within_target"),
            func.count()
            .filter(
                Incidente.severidad == "CRITICO",
                Incidente.fecha_primera_respuesta.is_not(None),
                epoch_frt <= 2 * 60,
            )
            .label("criticos_sla_ok"),
        ).where(
            Incidente.deleted_at.is_(None),
            Incidente.created_at >= start,
            Incidente.created_at < end,
        )
        result = await self.db.execute(statement)
        row = result.mappings().one()
        return {
            "total": int(row["total"] or 0),
            "resueltos": int(row["resueltos"] or 0),
            "criticos": int(row["criticos"] or 0),
            "escalados": int(row["escalados"] or 0),
            "frt_min": float(row["frt_min"]) if row["frt_min"] is not None else 0.0,
            "tmr_min": float(row["tmr_min"]) if row["tmr_min"] is not None else 0.0,
            "frt_within_target": int(row["frt_within_target"] or 0),
            "criticos_sla_ok": int(row["criticos_sla_ok"] or 0),
        }

    async def get_evolucion_diaria(
        self,
        start: datetime,
        end: datetime,
    ) -> list[dict[str, Any]]:
        """Series de tiempo bucketed por día con total / resueltos / críticos."""
        bucket = func.date_trunc("day", Incidente.created_at).label("dia")
        statement = (
            select(
                bucket,
                func.count().label("total"),
                func.count()
                .filter(Incidente.estado.in_(("RESUELTO", "CERRADO")))
                .label("resueltos"),
                func.count()
                .filter(Incidente.severidad == "CRITICO")
                .label("criticos"),
            )
            .where(
                Incidente.deleted_at.is_(None),
                Incidente.created_at >= start,
                Incidente.created_at < end,
            )
            .group_by(bucket)
            .order_by(bucket)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_count_por_tipo(
        self,
        start: datetime,
        end: datetime,
    ) -> list[dict[str, Any]]:
        """Conteo agrupado por categoría dentro del rango."""
        total = func.count().label("total")
        statement = (
            select(
                func.coalesce(Incidente.categoria, "otro").label("tipo"),
                total,
            )
            .where(
                Incidente.deleted_at.is_(None),
                Incidente.created_at >= start,
                Incidente.created_at < end,
            )
            .group_by(func.coalesce(Incidente.categoria, "otro"))
            .order_by(desc(total))
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_count_por_zona(
        self,
        start: datetime,
        end: datetime,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Conteo agrupado por lugar_referencia dentro del rango."""
        total = func.count().label("total")
        statement = (
            select(Incidente.lugar_referencia.label("zona"), total)
            .where(
                Incidente.deleted_at.is_(None),
                Incidente.lugar_referencia.is_not(None),
                Incidente.created_at >= start,
                Incidente.created_at < end,
            )
            .group_by(Incidente.lugar_referencia)
            .order_by(desc(total))
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_top_zonas(self, limit: int = 5) -> list[dict[str, Any]]:
        """Top zonas con más incidentes (excluyendo cerrados/resueltos)."""
        zona_total = func.count().label("total")
        statement = (
            select(Incidente.lugar_referencia.label("zona"), zona_total)
            .where(
                Incidente.deleted_at.is_(None),
                Incidente.lugar_referencia.is_not(None),
                Incidente.estado.notin_(("RESUELTO", "CERRADO")),
            )
            .group_by(Incidente.lugar_referencia)
            .order_by(desc(zona_total))
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_by_reportante(
        self,
        usuario_id: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        statement = (
            self._base_select()
            .where(Incidente.reportante_id == UUID(usuario_id))
            .order_by(Incidente.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    # ------------------------------------------------------------------
    # Escritura
    # ------------------------------------------------------------------

    async def _next_codigo(self, ahora: datetime) -> str:
        """Genera el siguiente código `INC-YYYYMMDD-NNNN` para la fecha dada.

        Cuenta los incidentes creados en el día (UTC) y suma uno. Para escenarios
        concurrentes podría producir colisiones; el constraint UNIQUE en
        `codigo` garantiza integridad y el llamador puede reintentar.
        """
        inicio_dia = datetime.combine(ahora.date(), time.min, tzinfo=timezone.utc)
        fin_dia = datetime.combine(ahora.date(), time.max, tzinfo=timezone.utc)
        statement = select(func.count(Incidente.id)).where(
            and_(
                Incidente.created_at >= inicio_dia,
                Incidente.created_at <= fin_dia,
            )
        )
        count = await self.db.scalar(statement) or 0
        secuencia = int(count) + 1
        return f"{INCIDENT_CODE_PREFIX}-{ahora.strftime('%Y%m%d')}-{secuencia:04d}"

    async def get_estado_actual(self, incidente_id: str) -> dict[str, Any] | None:
        """Devuelve el estado, fecha_primera_respuesta y supervisor_id actuales (para el flow de updates)."""
        statement = (
            select(
                Incidente.id,
                Incidente.codigo,
                Incidente.estado,
                Incidente.fecha_primera_respuesta,
                Incidente.fecha_resolucion,
                Incidente.supervisor_id,
                Incidente.operador_asignado_id,
            )
            .where(
                Incidente.id == UUID(incidente_id),
                Incidente.deleted_at.is_(None),
            )
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def update_estado(
        self,
        incidente_id: str,
        new_estado: str,
        ejecutor_id: str,
        comentario: str | None,
    ) -> dict[str, Any] | None:
        """Cambia el estado del incidente, autopobla fechas y registra historial."""
        actual = await self.get_estado_actual(incidente_id)
        if actual is None:
            return None

        ahora = datetime.now(timezone.utc)
        estado_anterior: str = str(actual["estado"])

        values: dict[str, Any] = {"estado": new_estado, "updated_at": ahora}
        # FRT: setear si aún no se había seteado y se sale de RECIBIDO.
        if (
            actual["fecha_primera_respuesta"] is None
            and new_estado != "RECIBIDO"
        ):
            values["fecha_primera_respuesta"] = ahora
        # TMR: setear cuando se resuelve o se cierra directamente.
        if new_estado in {"RESUELTO", "CERRADO"} and actual["fecha_resolucion"] is None:
            values["fecha_resolucion"] = ahora

        statement = (
            update(Incidente)
            .where(Incidente.id == UUID(incidente_id))
            .values(**values)
            .returning(Incidente.id)
        )
        result = await self.db.execute(statement)
        if result.scalar_one_or_none() is None:
            return None

        await self.db.execute(
            HistorialIncidente.__table__.insert().values(
                incidente_id=UUID(incidente_id),
                estado_anterior=estado_anterior,
                estado_nuevo=new_estado,
                accion="Cambio de estado",
                comentario=comentario,
                ejecutado_por_id=UUID(ejecutor_id),
            )
        )
        return {
            "id": incidente_id,
            "codigo": actual["codigo"],
            "estado_anterior": estado_anterior,
            "estado_nuevo": new_estado,
            "comentario": comentario,
        }

    async def assign_operador(
        self,
        incidente_id: str,
        operador_id: str,
        ejecutor_id: str,
        comentario: str | None,
    ) -> dict[str, Any] | None:
        """Asigna operador. Registra supervisor si está vacío. Inserta historial."""
        actual = await self.get_estado_actual(incidente_id)
        if actual is None:
            return None

        ahora = datetime.now(timezone.utc)
        estado_actual: str = str(actual["estado"])

        values: dict[str, Any] = {
            "operador_asignado_id": UUID(operador_id),
            "updated_at": ahora,
        }
        # Marcar supervisor si todavía no se había marcado (lo es quien asigna).
        if actual["supervisor_id"] is None:
            values["supervisor_id"] = UUID(ejecutor_id)
        # FRT: la asignación cuenta como primera respuesta si aún no la hay.
        if actual["fecha_primera_respuesta"] is None:
            values["fecha_primera_respuesta"] = ahora

        statement = (
            update(Incidente)
            .where(Incidente.id == UUID(incidente_id))
            .values(**values)
            .returning(Incidente.id)
        )
        result = await self.db.execute(statement)
        if result.scalar_one_or_none() is None:
            return None

        await self.db.execute(
            HistorialIncidente.__table__.insert().values(
                incidente_id=UUID(incidente_id),
                estado_anterior=estado_actual,
                estado_nuevo=estado_actual,
                accion="Asignación de operador",
                comentario=comentario,
                ejecutado_por_id=UUID(ejecutor_id),
            )
        )
        return {
            "id": incidente_id,
            "codigo": actual["codigo"],
            "estado": estado_actual,
            "operador_anterior_id": (
                str(actual["operador_asignado_id"])
                if actual["operador_asignado_id"]
                else None
            ),
            "operador_nuevo_id": operador_id,
            "supervisor_id": str(values.get("supervisor_id") or actual["supervisor_id"])
            if values.get("supervisor_id") or actual["supervisor_id"]
            else None,
            "comentario": comentario,
        }

    async def list_operadores(self) -> list[dict[str, Any]]:
        """Lista de usuarios con rol operador o supervisor (para asignación)."""
        statement = (
            select(
                Usuario.id,
                Usuario.nombre,
                Usuario.apellido,
                Usuario.email,
                Usuario.avatar_url,
                func.lower(Rol.nombre).label("rol"),
            )
            .join(UsuarioRol, UsuarioRol.usuario_id == Usuario.id)
            .join(Rol, Rol.id == UsuarioRol.rol_id)
            .where(
                Usuario.deleted_at.is_(None),
                Usuario.estado == "ACTIVO",
                func.lower(Rol.nombre).in_(("operador", "supervisor")),
            )
            .order_by(Rol.nombre, Usuario.nombre)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def create_incidente(
        self,
        reportante_id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        ahora = datetime.now(timezone.utc)
        codigo = await self._next_codigo(ahora)

        nuevo = Incidente(
            codigo=codigo,
            titulo=data["titulo"],
            descripcion=data["descripcion"],
            severidad=data.get("severidad"),
            categoria=data.get("categoria"),
            canal_origen=data.get("canal_origen", "WEB"),
            lugar_referencia=data.get("lugar_referencia"),
            reportante_id=UUID(reportante_id),
            estado="RECIBIDO",
        )
        latitud = data.get("latitud")
        longitud = data.get("longitud")
        if latitud is not None and longitud is not None:
            nuevo.geom = func.ST_SetSRID(func.ST_MakePoint(longitud, latitud), 4326)
        self.db.add(nuevo)
        await self.db.flush()
        await self.db.refresh(nuevo)
        return {
            "id": str(nuevo.id),
            "codigo": nuevo.codigo,
            "estado": nuevo.estado,
            "created_at": nuevo.created_at,
        }

    async def create_clasificacion_ia(
        self,
        *,
        incidente_id: str,
        categoria_sugerida: str | None,
        severidad_sugerida: str,
        confianza: float | None,
        origen: str,
        modelo_utilizado: str | None,
        prompt_version: str | None,
        respuesta_raw: dict[str, Any],
        categoria_final: str | None,
        severidad_final: str | None,
    ) -> dict[str, Any]:
        clasificacion = ClasificacionIa(
            incidente_id=UUID(incidente_id),
            categoria_sugerida=categoria_sugerida,
            severidad_sugerida=severidad_sugerida,
            confianza=confianza,
            origen=origen,
            modelo_utilizado=modelo_utilizado,
            prompt_version=prompt_version,
            respuesta_raw=respuesta_raw,
            categoria_final=categoria_final,
            severidad_final=severidad_final,
        )
        self.db.add(clasificacion)
        await self.db.flush()
        await self.db.refresh(clasificacion)
        return {"id": str(clasificacion.id)}
