"""
📁 apps/backend/app/services/incidente_service.py
🎯 Lógica de negocio para incidentes — listado, detalle, creación y KPIs.
📦 Capa: Servicios
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import NivelSeveridad
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.incidente_repository import IncidenteRepository
from app.repositories.notificacion_repository import NotificacionRepository
from app.schemas.incidente import (
    ComentarioIncidenteCreateInput,
    ComentarioIncidenteItem,
    DashboardStats,
    EvidenciaIncidenteItem,
    EvolucionPunto,
    ExpedienteCierreAiDraft,
    ExpedienteCierreOut,
    HistorialEvento,
    IncidenteAsignacionUpdate,
    IncidenteCreated,
    IncidenteCreateInput,
    IncidenteDetail,
    IncidenteEstadoUpdate,
    IncidenteListItem,
    IncidenteMapaItem,
    IncidenteMapaResponse,
    IncidentePriorizacionAi,
    KpiCard,
    KpisResponse,
    OperadorListItem,
    SlaIndicador,
    TipoCount,
    UsuarioMini,
    ZonaCount,
)
from app.schemas.auth import AuthUserResponse
from app.services.gemini_service import GeminiService
from app.services.storage_service import StorageService

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
    if period == "año":
        return 365
    return 30


def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100, 1)


class IncidenteService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = IncidenteRepository(db)
        self._auditoria = AuditoriaRepository(db)
        self._notificaciones = NotificacionRepository(db)
        self._gemini = GeminiService()

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

    async def listar_mapa(
        self,
        *,
        severidad: str | None = None,
        estado: str | None = None,
        activos_only: bool = True,
        limit: int = 300,
    ) -> IncidenteMapaResponse:
        safe_limit = max(1, min(limit, 500))
        rows = await self._repo.list_mapa(
            severidad=severidad,
            estado=estado,
            activos_only=activos_only,
            limit=safe_limit,
        )
        items = [self._map_mapa_item(row) for row in rows]
        georreferenciados = sum(
            1 for item in items if item.latitud is not None and item.longitud is not None
        )
        return IncidenteMapaResponse(
            items=items,
            total=len(items),
            georreferenciados=georreferenciados,
            sin_coordenadas=len(items) - georreferenciados,
        )

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
        period_norm = period if period in {"semana", "mes", "trimestre", "año"} else "mes"
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
        comentarios_rows = await self._repo.list_comentarios(
            incidente_id,
            include_internal=True,
        )
        evidencias_rows = await self._repo.list_evidencias(incidente_id)
        expediente_row = await self._repo.get_expediente_cierre(incidente_id)

        return IncidenteDetail(
            id=str(row["id"]),
            codigo=row["codigo"],
            titulo=row["titulo"],
            descripcion=row["descripcion"],
            estado=row["estado"],
            severidad=row.get("severidad"),
            categoria=row.get("categoria"),
            lugar_referencia=row.get("lugar_referencia"),
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
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
            comentarios=[self._map_comentario(c) for c in comentarios_rows],
            evidencias=[self._map_evidencia(e) for e in evidencias_rows],
            expediente_cierre=(
                self._map_expediente_cierre(expediente_row)
                if expediente_row
                else None
            ),
        )

    async def obtener_mi_detalle(
        self,
        incidente_ref: str,
        usuario_id: str,
    ) -> IncidenteDetail:
        row = await self._repo.get_detail_by_code_or_id_for_reportante(
            incidente_ref,
            usuario_id,
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incidente no encontrado.",
            )

        incidente_id = str(row["id"])
        historial_rows = await self._repo.list_historial(incidente_id)
        comentarios_rows = await self._repo.list_comentarios(
            incidente_id,
            include_internal=False,
        )
        evidencias_rows = await self._repo.list_evidencias(incidente_id)
        expediente_row = await self._repo.get_expediente_cierre(incidente_id)

        return IncidenteDetail(
            id=incidente_id,
            codigo=row["codigo"],
            titulo=row["titulo"],
            descripcion=row["descripcion"],
            estado=row["estado"],
            severidad=row.get("severidad"),
            categoria=row.get("categoria"),
            lugar_referencia=row.get("lugar_referencia"),
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
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
            comentarios=[self._map_comentario(c) for c in comentarios_rows],
            evidencias=[self._map_evidencia(e) for e in evidencias_rows],
            expediente_cierre=(
                self._map_expediente_cierre(expediente_row)
                if expediente_row
                else None
            ),
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
        resumen_cierre = data.resumen_cierre.strip() if data.resumen_cierre else None
        resultado_cierre = data.resultado_cierre.strip() if data.resultado_cierre else None
        if data.estado.value == "CERRADO" and not resumen_cierre:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El resumen de cierre es obligatorio al cerrar un incidente.",
            )

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
        await self._registrar_auditoria_incidente(
            usuario_id=ejecutor_id,
            accion="cambiar_estado",
            incidente_id=incidente_id,
            detalle={
                "codigo": result["codigo"],
                "estado_anterior": result["estado_anterior"],
                "estado_nuevo": result["estado_nuevo"],
                "comentario": result["comentario"],
            },
        )
        if data.estado.value == "CERRADO":
            detalle_cerrado = await self.obtener_detalle(incidente_id)
            snapshot = detalle_cerrado.model_dump(
                mode="json",
                exclude={"expediente_cierre"},
            )
            await self._repo.upsert_expediente_cierre(
                incidente_id=incidente_id,
                resumen_cierre=resumen_cierre or "",
                resultado=resultado_cierre,
                snapshot={
                    **snapshot,
                    "cierre": {
                        "resumen_cierre": resumen_cierre,
                        "resultado": resultado_cierre,
                        "generado_por_id": ejecutor_id,
                    },
                },
                generado_por_id=ejecutor_id,
            )
            await self._registrar_auditoria_incidente(
                usuario_id=ejecutor_id,
                accion="generar_expediente_cierre",
                incidente_id=incidente_id,
                detalle={
                    "codigo": result["codigo"],
                    "resultado": resultado_cierre,
                },
            )
        participantes = await self._repo.get_participantes(incidente_id)
        if participantes:
            await self._notify_unique(
                destinatarios=[participantes["reportante_id"]],
                tipo_evento="INCIDENTE_ESTADO_CAMBIADO",
                asunto=f"Estado actualizado: {participantes['codigo']}",
                contenido=f"Tu incidente ahora esta en estado {data.estado.value}.",
                incidente_id=incidente_id,
                exclude={ejecutor_id},
            )
        return await self.obtener_detalle(incidente_id)

    async def generar_borrador_cierre_ia(
        self,
        incidente_id: str,
        ejecutor_id: str,
    ) -> ExpedienteCierreAiDraft:
        detalle = await self.obtener_detalle(incidente_id)
        contexto = self._build_contexto_cierre_ia(detalle)
        draft = await self._gemini.generar_borrador_cierre(contexto=contexto)
        await self._registrar_auditoria_incidente(
            usuario_id=ejecutor_id,
            accion="generar_borrador_cierre_ia",
            incidente_id=incidente_id,
            detalle={
                "codigo": detalle.codigo,
                "estado": detalle.estado.value,
                "modelo": "gemini",
            },
        )
        return draft

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
        await self._registrar_auditoria_incidente(
            usuario_id=ejecutor_id,
            accion="asignar_operador",
            incidente_id=incidente_id,
            detalle={
                "codigo": result["codigo"],
                "estado": result["estado"],
                "operador_anterior_id": result["operador_anterior_id"],
                "operador_nuevo_id": result["operador_nuevo_id"],
                "supervisor_id": result["supervisor_id"],
                "comentario": result["comentario"],
            },
        )
        participantes = await self._repo.get_participantes(incidente_id)
        if participantes:
            await self._notify_unique(
                destinatarios=[
                    data.operador_asignado_id,
                    participantes["reportante_id"],
                ],
                tipo_evento="INCIDENTE_ASIGNADO",
                asunto=f"Asignacion actualizada: {participantes['codigo']}",
                contenido=f"Se actualizo la asignacion del incidente {participantes['codigo']}.",
                incidente_id=incidente_id,
                exclude={ejecutor_id},
            )
        return await self.obtener_detalle(incidente_id)

    async def crear_comentario(
        self,
        incidente_id: str,
        autor_id: str,
        roles: list[str],
        data: ComentarioIncidenteCreateInput,
    ) -> ComentarioIncidenteItem:
        try:
            UUID(incidente_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de incidente invalido.",
            ) from exc

        participantes = await self._repo.get_participantes(incidente_id)
        if not participantes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incidente no encontrado.",
            )

        is_operativo = bool({"supervisor", "operador", "administrador"}.intersection(roles))
        is_reportante = str(participantes["reportante_id"]) == autor_id
        if not is_operativo and not is_reportante:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para comentar este incidente.",
            )

        es_interno = bool(data.es_interno and is_operativo)
        row = await self._repo.create_comentario(
            incidente_id=incidente_id,
            autor_id=autor_id,
            contenido=data.contenido.strip(),
            es_interno=es_interno,
        )
        if is_operativo:
            await self._registrar_auditoria_incidente(
                usuario_id=autor_id,
                accion="crear_comentario",
                incidente_id=incidente_id,
                detalle={
                    "codigo": participantes["codigo"],
                    "comentario_id": str(row["id"]),
                    "es_interno": es_interno,
                    "contenido_preview": row["contenido"][:160],
                    "actor_roles": roles,
                },
            )

        if not es_interno:
            destinatarios = []
            if is_reportante:
                destinatarios.extend(
                    [
                        participantes.get("supervisor_id"),
                        participantes.get("operador_asignado_id"),
                    ]
                )
                if not any(destinatarios):
                    supervisores = await self._repo.list_usuarios_by_roles(
                        {"supervisor", "administrador"}
                    )
                    destinatarios.extend(row["id"] for row in supervisores)
            else:
                destinatarios.append(participantes["reportante_id"])

            await self._notify_unique(
                destinatarios=destinatarios,
                tipo_evento="INCIDENTE_NUEVO_MENSAJE",
                asunto=f"Nuevo mensaje: {participantes['codigo']}",
                contenido=f"Hay un nuevo mensaje en el incidente {participantes['codigo']}.",
                incidente_id=incidente_id,
                exclude={autor_id},
            )

        return ComentarioIncidenteItem(
            id=str(row["id"]),
            incidente_id=str(row["incidente_id"]),
            autor=self._build_usuario_mini(row["autor_id"], None, None, None, None),
            contenido=row["contenido"],
            es_interno=row["es_interno"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

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
        priorizacion_override: IncidentePriorizacionAi | None = None,
    ) -> IncidenteCreated:
        descripcion = data.descripcion.strip() if data.descripcion else None
        priorizacion = priorizacion_override or await self._priorizar_incidente_ia(data, descripcion)
        severidad_final = (
            data.severidad.value
            if data.severidad
            else priorizacion.severidad.value
        )
        categoria_final = (
            data.categoria.strip()
            if data.categoria
            else priorizacion.categoria_sugerida
        )
        creado = await self._repo.create_incidente(
            reportante_id=reportante_id,
            data={
                "titulo": data.titulo.strip(),
                "descripcion": descripcion,
                "severidad": severidad_final,
                "categoria": categoria_final,
                "latitud": data.latitud,
                "longitud": data.longitud,
                "lugar_referencia": (
                    data.lugar_referencia.strip() if data.lugar_referencia else None
                ),
                "canal_origen": data.canal_origen.value,
            },
        )
        await self._repo.create_clasificacion_ia(
            incidente_id=creado["id"],
            categoria_sugerida=priorizacion.categoria_sugerida,
            severidad_sugerida=priorizacion.severidad.value,
            confianza=priorizacion.confianza,
            origen="IA" if settings.GEMINI_API_KEY else "FALLBACK",
            modelo_utilizado=settings.GEMINI_MODEL if settings.GEMINI_API_KEY else None,
            prompt_version="incidente_priorizacion_v1",
            respuesta_raw={
                "severidad": priorizacion.severidad.value,
                "categoria_sugerida": priorizacion.categoria_sugerida,
                "confianza": priorizacion.confianza,
                "justificacion": priorizacion.justificacion,
                "fuente": "gemini" if settings.GEMINI_API_KEY else "fallback",
            },
            categoria_final=categoria_final,
            severidad_final=severidad_final,
        )
        await self._registrar_auditoria_incidente(
            usuario_id=reportante_id,
            accion="crear_incidente",
            incidente_id=creado["id"],
            detalle={
                "codigo": creado["codigo"],
                "estado": creado["estado"],
                "canal_origen": data.canal_origen.value,
                "severidad_final": severidad_final,
                "severidad_sugerida_ia": priorizacion.severidad.value,
                "categoria_sugerida_ia": priorizacion.categoria_sugerida,
            },
        )
        await self._registrar_auditoria_incidente(
            usuario_id=reportante_id,
            accion="priorizar_incidente_ia",
            incidente_id=creado["id"],
            detalle={
                "codigo": creado["codigo"],
                "severidad_sugerida": priorizacion.severidad.value,
                "severidad_final": severidad_final,
                "categoria_sugerida": priorizacion.categoria_sugerida,
                "confianza": priorizacion.confianza,
                "justificacion": priorizacion.justificacion,
            },
        )
        supervisores = await self._repo.list_usuarios_by_roles(
            {"supervisor", "administrador"}
        )
        await self._notify_unique(
            destinatarios=[row["id"] for row in supervisores],
            tipo_evento="INCIDENTE_NUEVO",
            asunto=f"Nuevo incidente: {creado['codigo']}",
            contenido=f"Se registro un nuevo incidente desde la PWA: {creado['codigo']}.",
            incidente_id=creado["id"],
            exclude={reportante_id},
        )
        return IncidenteCreated.model_validate(creado)

    async def _priorizar_incidente_ia(
        self,
        data: IncidenteCreateInput,
        descripcion: str | None,
    ) -> Any:
        contexto = {
            "titulo": data.titulo.strip(),
            "descripcion": descripcion,
            "categoria_reportada": data.categoria.strip() if data.categoria else None,
            "severidad_reportada": data.severidad.value if data.severidad else None,
            "lugar_referencia": (
                data.lugar_referencia.strip() if data.lugar_referencia else None
            ),
            "canal_origen": "WEB",
        }
        try:
            return await self._gemini.priorizar_incidente(contexto=contexto)
        except Exception:
            fallback = data.severidad or NivelSeveridad.MEDIO
            return IncidentePriorizacionAi(
                severidad=fallback,
                categoria_sugerida=data.categoria.strip() if data.categoria else None,
                confianza=0.0,
                justificacion="Fallback local por indisponibilidad de priorizacion IA.",
            )

    _MIME_PERMITIDOS = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/gif",
    }
    _MAX_BYTES = 10 * 1024 * 1024  # 10 MB

    async def subir_evidencia(
        self,
        *,
        incidente_id: str,
        archivo: UploadFile,
        descripcion: str | None,
        usuario_actual: AuthUserResponse,
    ) -> EvidenciaIncidenteItem:
        """Valida, sube a Supabase Storage y registra la evidencia en BD."""
        try:
            UUID(incidente_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de incidente inválido.",
            ) from exc

        participantes = await self._repo.get_participantes(incidente_id)
        if not participantes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incidente no encontrado.",
            )

        es_reportante = str(participantes["reportante_id"]) == usuario_actual.id
        es_staff = bool({"supervisor", "operador", "administrador"}.intersection(usuario_actual.roles))
        if not es_reportante and not es_staff:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para adjuntar evidencias a este incidente.",
            )

        mime = archivo.content_type or ""
        if mime not in self._MIME_PERMITIDOS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Tipo de archivo no permitido. Solo se aceptan imágenes (jpg, png, webp, heic, gif).",
            )

        contenido = await archivo.read()
        if len(contenido) > self._MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="El archivo supera el límite de 10 MB.",
            )

        storage = StorageService()
        nombre_seguro = archivo.filename or "evidencia"
        ruta = f"{incidente_id}/{uuid4().hex}_{nombre_seguro}"
        from app.core.config import settings as _settings

        url = await storage.upload(
            bucket=_settings.SUPABASE_STORAGE_BUCKET,
            path=ruta,
            content=contenido,
            content_type=mime,
        )

        tipo_archivo = mime.split("/")[0]
        row = await self._repo.create_evidencia(
            incidente_id=incidente_id,
            tipo_archivo=tipo_archivo,
            nombre_archivo=nombre_seguro,
            url_archivo=url,
            tamano_bytes=len(contenido),
            mime_type=mime,
            descripcion=descripcion,
            cargado_por_id=usuario_actual.id,
        )

        await self._registrar_auditoria_incidente(
            usuario_id=usuario_actual.id,
            accion="subir_evidencia",
            incidente_id=incidente_id,
            detalle={
                "codigo": participantes["codigo"],
                "nombre_archivo": nombre_seguro,
                "mime_type": mime,
                "tamano_bytes": len(contenido),
            },
        )

        cargado_por = UsuarioMini(
            id=usuario_actual.id,
            nombre_completo=f"{usuario_actual.nombre} {usuario_actual.apellido}".strip(),
            email=usuario_actual.email,
            avatar_url=usuario_actual.avatar_url,
        )
        return EvidenciaIncidenteItem(
            id=str(row["id"]),
            incidente_id=str(row["incidente_id"]),
            tipo_archivo=str(row["tipo_archivo"]),
            nombre_archivo=str(row["nombre_archivo"]),
            url_archivo=str(row["url_archivo"]),
            tamano_bytes=row.get("tamano_bytes"),
            mime_type=row.get("mime_type"),
            descripcion=row.get("descripcion"),
            cargado_por=cargado_por,
            created_at=row["created_at"],
        )

    async def _registrar_auditoria_incidente(
        self,
        *,
        usuario_id: str,
        accion: str,
        incidente_id: str,
        detalle: dict[str, Any],
    ) -> None:
        await self._auditoria.create_registro(
            usuario_id=usuario_id,
            modulo="incidentes",
            accion=accion,
            entidad="incidente",
            entidad_id=incidente_id,
            detalle=detalle,
        )

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

    @classmethod
    def _map_comentario(cls, row: dict[str, Any]) -> ComentarioIncidenteItem:
        autor = cls._build_usuario_mini(
            row.get("autor_id"),
            row.get("autor_nombre"),
            row.get("autor_apellido"),
            row.get("autor_email"),
            row.get("autor_avatar_url"),
        )
        return ComentarioIncidenteItem(
            id=str(row["id"]),
            incidente_id=str(row["incidente_id"]),
            autor=autor,
            contenido=row["contenido"],
            es_interno=bool(row["es_interno"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @classmethod
    def _map_evidencia(cls, row: dict[str, Any]) -> EvidenciaIncidenteItem:
        cargado_por = cls._build_usuario_mini(
            row.get("cargado_por_id"),
            row.get("cargado_por_nombre"),
            row.get("cargado_por_apellido"),
            row.get("cargado_por_email"),
            row.get("cargado_por_avatar_url"),
        )
        return EvidenciaIncidenteItem(
            id=str(row["id"]),
            incidente_id=str(row["incidente_id"]),
            tipo_archivo=str(row["tipo_archivo"]),
            nombre_archivo=str(row["nombre_archivo"]),
            url_archivo=str(row["url_archivo"]),
            tamano_bytes=row.get("tamano_bytes"),
            mime_type=row.get("mime_type"),
            descripcion=row.get("descripcion"),
            cargado_por=cargado_por,
            created_at=row["created_at"],
        )

    @classmethod
    def _map_expediente_cierre(
        cls,
        row: dict[str, Any],
    ) -> ExpedienteCierreOut:
        generado_por = cls._build_usuario_mini(
            row.get("generado_por_id"),
            row.get("generado_por_nombre"),
            row.get("generado_por_apellido"),
            row.get("generado_por_email"),
            row.get("generado_por_avatar_url"),
        )
        return ExpedienteCierreOut(
            id=str(row["id"]),
            incidente_id=str(row["incidente_id"]),
            resumen_cierre=str(row["resumen_cierre"]),
            resultado=row.get("resultado"),
            snapshot=row.get("snapshot") or {},
            generado_por=generado_por,
            pdf_url=row.get("pdf_url"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @staticmethod
    def _usuario_contexto(usuario: UsuarioMini | None) -> dict[str, Any] | None:
        if not usuario:
            return None
        return {
            "nombre": usuario.nombre_completo,
        }

    @classmethod
    def _build_contexto_cierre_ia(cls, detalle: IncidenteDetail) -> dict[str, Any]:
        return {
            "incidente": {
                "codigo": detalle.codigo,
                "titulo": detalle.titulo,
                "descripcion": detalle.descripcion,
                "estado": detalle.estado.value,
                "severidad": detalle.severidad.value if detalle.severidad else None,
                "categoria": detalle.categoria,
                "lugar_referencia": detalle.lugar_referencia,
                "canal_origen": detalle.canal_origen.value,
                "reportado_el": detalle.created_at.isoformat(),
                "primera_respuesta": (
                    detalle.fecha_primera_respuesta.isoformat()
                    if detalle.fecha_primera_respuesta
                    else None
                ),
                "resuelto_el": (
                    detalle.fecha_resolucion.isoformat()
                    if detalle.fecha_resolucion
                    else None
                ),
            },
            "participantes": {
                "reportante": cls._usuario_contexto(detalle.reportante),
                "operador_asignado": cls._usuario_contexto(
                    detalle.operador_asignado
                ),
                "supervisor": cls._usuario_contexto(detalle.supervisor),
            },
            "historial": [
                {
                    "accion": item.accion,
                    "estado_anterior": (
                        item.estado_anterior.value if item.estado_anterior else None
                    ),
                    "estado_nuevo": item.estado_nuevo.value,
                    "comentario": item.comentario,
                    "ejecutado_por": cls._usuario_contexto(item.ejecutado_por),
                    "fecha": item.created_at.isoformat(),
                }
                for item in detalle.historial
            ],
            "comentarios": [
                {
                    "autor": cls._usuario_contexto(item.autor),
                    "contenido": item.contenido,
                    "es_interno": item.es_interno,
                    "fecha": item.created_at.isoformat(),
                }
                for item in detalle.comentarios
            ],
            "evidencias": [
                {
                    "tipo_archivo": item.tipo_archivo,
                    "nombre_archivo": item.nombre_archivo,
                    "descripcion": item.descripcion,
                    "mime_type": item.mime_type,
                    "fecha": item.created_at.isoformat(),
                    "cargado_por": cls._usuario_contexto(item.cargado_por),
                }
                for item in detalle.evidencias
            ],
        }

    async def _notify_unique(
        self,
        *,
        destinatarios: list[Any],
        tipo_evento: str,
        asunto: str,
        contenido: str,
        incidente_id: str,
        exclude: set[str] | None = None,
    ) -> None:
        excluded = exclude or set()
        unique_ids = {
            str(destinatario)
            for destinatario in destinatarios
            if destinatario and str(destinatario) not in excluded
        }
        for destinatario_id in unique_ids:
            await self._notificaciones.create_inapp(
                destinatario_id=destinatario_id,
                tipo_evento=tipo_evento,
                asunto=asunto,
                contenido=contenido,
                incidente_id=incidente_id,
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
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
            canal_origen=row["canal_origen"],
            operador_nombre=row.get("operador_nombre"),
            operador_avatar_url=row.get("operador_avatar_url"),
            created_at=row.get("created_at"),
        )

    @staticmethod
    def _map_mapa_item(row: dict[str, Any]) -> IncidenteMapaItem:
        return IncidenteMapaItem(
            id=str(row["id"]),
            codigo=row["codigo"],
            titulo=row["titulo"],
            estado=row["estado"],
            severidad=row.get("severidad"),
            categoria=row.get("categoria"),
            lugar_referencia=row.get("lugar_referencia"),
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
            created_at=row.get("created_at"),
        )
