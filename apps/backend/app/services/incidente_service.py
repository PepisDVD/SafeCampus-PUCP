"""
📁 apps/backend/app/services/incidente_service.py
🎯 Lógica de negocio para incidentes — listado, detalle, creación y KPIs.
📦 Capa: Servicios
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.incidente_repository import IncidenteRepository
from app.schemas.incidente import (
    DashboardStats,
    EvolucionPunto,
    HistorialEvento,
    IncidenteAsignacionUpdate,
    IncidenteCreated,
    IncidenteCreateInput,
    IncidenteDetail,
    IncidenteEstadoUpdate,
    IncidenteListItem,
    KpiCard,
    KpisResponse,
    OperadorListItem,
    SlaIndicador,
    TipoCount,
    UsuarioMini,
    ZonaCount,
)


# Targets de SLA — constantes operativas.
FRT_TARGET_MIN = 5.0
TMR_TARGET_MIN = 60.0
ESCALAMIENTO_TARGET_PCT = 15.0
SLA_CRITICOS_TARGET_PCT = 90.0


def _period_days(period: str) -> int:
    if period == "semana":
        return 7
    if period == "trimestre":
        return 90
    return 30


def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100, 1)


class IncidenteService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = IncidenteRepository(db)

    async def listar_recentes(
        self,
        *,
        search: str | None = None,
        severidad: str | None = None,
        estado: str | None = None,
        limit: int = 20,
    ) -> list[IncidenteListItem]:
        safe_limit = max(1, min(limit, 200))
        rows = await self._repo.list_recentes(
            search=search,
            severidad=severidad,
            estado=estado,
            limit=safe_limit,
        )
        return [self._map_list_item(r) for r in rows]

    async def listar_mis_incidentes(
        self,
        usuario_id: str,
        limit: int = 50,
    ) -> list[IncidenteListItem]:
        safe_limit = max(1, min(limit, 100))
        rows = await self._repo.list_by_reportante(usuario_id, limit=safe_limit)
        return [self._map_list_item(r) for r in rows]

    async def obtener_stats(self) -> DashboardStats:
        """Métricas agregadas + top zonas para el dashboard operativo."""
        counts = await self._repo.get_stats()
        zonas = await self._repo.get_top_zonas(limit=5)
        return DashboardStats(
            total=counts["total"],
            activos=counts["activos"],
            criticos=counts["criticos"],
            en_atencion=counts["en_atencion"],
            resueltos_24h=counts["resueltos_24h"],
            por_zona=[
                ZonaCount(zona=str(z["zona"]), total=int(z["total"]))
                for z in zonas
            ],
        )

    async def obtener_kpis(self, period: str) -> KpisResponse:
        """KPIs del periodo + comparación vs periodo anterior + breakdowns."""
        period_norm = period if period in {"semana", "mes", "trimestre"} else "mes"
        days = _period_days(period_norm)
        end = datetime.now(timezone.utc)
        start_current = end - timedelta(days=days)
        start_previous = start_current - timedelta(days=days)

        current = await self._repo.get_period_aggregates(start_current, end)
        previous = await self._repo.get_period_aggregates(start_previous, start_current)
        evolucion_rows = await self._repo.get_evolucion_diaria(start_current, end)
        tipo_rows = await self._repo.get_count_por_tipo(start_current, end)
        zona_rows = await self._repo.get_count_por_zona(start_current, end)

        # Tasas derivadas.
        def tasa_resolucion(stats: dict[str, Any]) -> float:
            return (stats["resueltos"] / stats["total"] * 100) if stats["total"] else 0.0

        def sla_pct(stats: dict[str, Any]) -> float:
            return (
                stats["frt_within_target"] / stats["total"] * 100
                if stats["total"]
                else 0.0
            )

        def escalamiento_pct(stats: dict[str, Any]) -> float:
            return (stats["escalados"] / stats["total"] * 100) if stats["total"] else 0.0

        def sla_criticos_pct(stats: dict[str, Any]) -> float:
            return (
                stats["criticos_sla_ok"] / stats["criticos"] * 100
                if stats["criticos"]
                else 0.0
            )

        cur_tasa = tasa_resolucion(current)
        prev_tasa = tasa_resolucion(previous)
        cur_sla = sla_pct(current)
        prev_sla = sla_pct(previous)

        # Por tipo con porcentajes.
        total_tipos = sum(int(r["total"]) for r in tipo_rows) or 1
        por_tipo = [
            TipoCount(
                tipo=str(r["tipo"]),
                total=int(r["total"]),
                porcentaje=round(int(r["total"]) / total_tipos * 100, 1),
            )
            for r in tipo_rows
        ]

        evolucion = [
            EvolucionPunto(
                fecha=row["dia"].date().isoformat(),
                total=int(row["total"]),
                resueltos=int(row["resueltos"]),
                criticos=int(row["criticos"]),
            )
            for row in evolucion_rows
        ]

        por_zona = [
            ZonaCount(zona=str(r["zona"]), total=int(r["total"]))
            for r in zona_rows
        ]

        sla_indicadores = {
            "frt": SlaIndicador(
                actual=round(current["frt_min"], 1),
                objetivo=FRT_TARGET_MIN,
                unidad="min",
            ),
            "tmr": SlaIndicador(
                actual=round(current["tmr_min"], 1),
                objetivo=TMR_TARGET_MIN,
                unidad="min",
            ),
            "escalamiento": SlaIndicador(
                actual=round(escalamiento_pct(current), 1),
                objetivo=ESCALAMIENTO_TARGET_PCT,
                unidad="%",
            ),
            "criticos_sla": SlaIndicador(
                actual=round(sla_criticos_pct(current), 1),
                objetivo=SLA_CRITICOS_TARGET_PCT,
                unidad="%",
            ),
        }

        return KpisResponse(
            period=period_norm,
            frt=KpiCard(
                valor=round(current["frt_min"], 1),
                cambio_pct=_pct_change(current["frt_min"], previous["frt_min"]),
                unidad="min",
            ),
            tmr=KpiCard(
                valor=round(current["tmr_min"], 1),
                cambio_pct=_pct_change(current["tmr_min"], previous["tmr_min"]),
                unidad="min",
            ),
            total_incidentes=KpiCard(
                valor=current["total"],
                cambio_pct=_pct_change(current["total"], previous["total"]),
                unidad="",
            ),
            tasa_resolucion=KpiCard(
                valor=round(cur_tasa, 1),
                cambio_pct=round(cur_tasa - prev_tasa, 1),
                unidad="%",
            ),
            criticos=KpiCard(
                valor=current["criticos"],
                cambio_pct=_pct_change(current["criticos"], previous["criticos"]),
                unidad="",
            ),
            sla_cumplimiento=KpiCard(
                valor=round(cur_sla, 1),
                cambio_pct=round(cur_sla - prev_sla, 1),
                unidad="%",
            ),
            evolucion=evolucion,
            por_tipo=por_tipo,
            por_zona=por_zona,
            sla=sla_indicadores,
        )

    async def obtener_detalle(self, incidente_id: str) -> IncidenteDetail:
        try:
            UUID(incidente_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de incidente inválido.",
            ) from exc

        row = await self._repo.get_detail_by_id(incidente_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incidente no encontrado.",
            )

        historial_rows = await self._repo.list_historial(incidente_id)

        return IncidenteDetail(
            id=str(row["id"]),
            codigo=row["codigo"],
            titulo=row["titulo"],
            descripcion=row["descripcion"],
            estado=row["estado"],
            severidad=row.get("severidad"),
            categoria=row.get("categoria"),
            lugar_referencia=row.get("lugar_referencia"),
            canal_origen=row["canal_origen"],
            fecha_primera_respuesta=row.get("fecha_primera_respuesta"),
            fecha_resolucion=row.get("fecha_resolucion"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            reportante=self._build_usuario_mini(
                row.get("reportante_id"),
                row.get("reportante_nombre"),
                row.get("reportante_apellido"),
                row.get("reportante_email"),
                row.get("reportante_avatar_url"),
            ),
            operador_asignado=self._build_usuario_mini(
                row.get("operador_asignado_id"),
                row.get("operador_nombre"),
                row.get("operador_apellido"),
                row.get("operador_email"),
                row.get("operador_avatar_url"),
            ),
            supervisor=self._build_usuario_mini(
                row.get("supervisor_id"),
                row.get("supervisor_nombre"),
                row.get("supervisor_apellido"),
                row.get("supervisor_email"),
                row.get("supervisor_avatar_url"),
            ),
            historial=[self._map_historial(h) for h in historial_rows],
        )

    async def cambiar_estado(
        self,
        incidente_id: str,
        ejecutor_id: str,
        data: IncidenteEstadoUpdate,
    ) -> IncidenteDetail:
        try:
            UUID(incidente_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de incidente inválido.",
            ) from exc

        result = await self._repo.update_estado(
            incidente_id=incidente_id,
            new_estado=data.estado.value,
            ejecutor_id=ejecutor_id,
            comentario=data.comentario.strip() if data.comentario else None,
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incidente no encontrado.",
            )
        return await self.obtener_detalle(incidente_id)

    async def asignar_operador(
        self,
        incidente_id: str,
        ejecutor_id: str,
        data: IncidenteAsignacionUpdate,
    ) -> IncidenteDetail:
        try:
            UUID(incidente_id)
            UUID(data.operador_asignado_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID inválido.",
            ) from exc

        result = await self._repo.assign_operador(
            incidente_id=incidente_id,
            operador_id=data.operador_asignado_id,
            ejecutor_id=ejecutor_id,
            comentario=data.comentario.strip() if data.comentario else None,
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incidente no encontrado.",
            )
        return await self.obtener_detalle(incidente_id)

    async def listar_operadores(self) -> list[OperadorListItem]:
        rows = await self._repo.list_operadores()
        return [
            OperadorListItem(
                id=str(r["id"]),
                nombre_completo=f"{r['nombre']} {r['apellido']}".strip(),
                email=str(r["email"]),
                avatar_url=r.get("avatar_url"),
                rol=str(r["rol"]),
            )
            for r in rows
        ]

    async def crear_incidente(
        self,
        reportante_id: str,
        data: IncidenteCreateInput,
    ) -> IncidenteCreated:
        creado = await self._repo.create_incidente(
            reportante_id=reportante_id,
            data={
                "titulo": data.titulo.strip(),
                "descripcion": data.descripcion.strip(),
                "categoria": data.categoria.strip() if data.categoria else None,
                "lugar_referencia": (
                    data.lugar_referencia.strip() if data.lugar_referencia else None
                ),
                "canal_origen": "WEB",
            },
        )
        return IncidenteCreated.model_validate(creado)

    @staticmethod
    def _build_usuario_mini(
        user_id: Any,
        nombre: str | None,
        apellido: str | None,
        email: str | None,
        avatar_url: str | None,
    ) -> UsuarioMini | None:
        if not user_id:
            return None
        full_name = f"{nombre or ''} {apellido or ''}".strip() or "Usuario"
        return UsuarioMini(
            id=str(user_id),
            nombre_completo=full_name,
            email=email,
            avatar_url=avatar_url,
        )

    @classmethod
    def _map_historial(cls, row: dict[str, Any]) -> HistorialEvento:
        ejecutor = cls._build_usuario_mini(
            row.get("ejecutado_por_id"),
            row.get("ejecutor_nombre"),
            row.get("ejecutor_apellido"),
            row.get("ejecutor_email"),
            row.get("ejecutor_avatar_url"),
        )
        return HistorialEvento(
            id=str(row["id"]),
            estado_anterior=row.get("estado_anterior"),
            estado_nuevo=row["estado_nuevo"],
            accion=row["accion"],
            comentario=row.get("comentario"),
            ejecutado_por=ejecutor,
            created_at=row["created_at"],
        )

    @staticmethod
    def _map_list_item(row: dict[str, Any]) -> IncidenteListItem:
        return IncidenteListItem(
            id=str(row["id"]),
            codigo=row["codigo"],
            titulo=row["titulo"],
            descripcion=row.get("descripcion"),
            estado=row["estado"],
            severidad=row.get("severidad"),
            categoria=row.get("categoria"),
            lugar_referencia=row.get("lugar_referencia"),
            canal_origen=row["canal_origen"],
            operador_nombre=row.get("operador_nombre"),
            operador_avatar_url=row.get("operador_avatar_url"),
            created_at=row.get("created_at"),
        )