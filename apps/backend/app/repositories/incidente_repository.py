"""
📁 apps/backend/app/repositories/incidente_repository.py
🎯 Repositorio de incidentes — consultas SQLAlchemy contra sc_incidentes.incidente.
📦 Capa: Repositorios
"""

from datetime import datetime, time, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.constants import INCIDENT_CODE_PREFIX
from app.models.sc_incidentes import HistorialIncidente, Incidente
from app.models.sc_users import Usuario


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
            categoria=data.get("categoria"),
            canal_origen=data.get("canal_origen", "WEB"),
            lugar_referencia=data.get("lugar_referencia"),
            reportante_id=UUID(reportante_id),
            estado="RECIBIDO",
        )
        self.db.add(nuevo)
        await self.db.flush()
        await self.db.refresh(nuevo)
        return {
            "id": str(nuevo.id),
            "codigo": nuevo.codigo,
            "estado": nuevo.estado,
            "created_at": nuevo.created_at,
        }