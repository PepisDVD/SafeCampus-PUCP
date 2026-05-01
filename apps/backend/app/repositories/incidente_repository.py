"""
📁 apps/backend/app/repositories/incidente_repository.py
🎯 Repositorio de incidentes — consultas SQLAlchemy contra sc_incidentes.incidente.
📦 Capa: Repositorios
"""

from datetime import datetime, time, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import INCIDENT_CODE_PREFIX
from app.models.sc_incidentes import Incidente
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
            )
            .outerjoin(Usuario, Usuario.id == Incidente.operador_asignado_id)
            .where(Incidente.deleted_at.is_(None))
        )

    async def list_recentes(self, limit: int = 20) -> list[dict[str, Any]]:
        statement = (
            self._base_select()
            .order_by(Incidente.created_at.desc())
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