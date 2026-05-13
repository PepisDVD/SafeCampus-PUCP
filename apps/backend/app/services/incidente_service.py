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

from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.incidente_repository import IncidenteRepository
from app.repositories.notificacion_repository import NotificacionRepository
from app.schemas.incidente import (
    ComentarioIncidenteCreateInput,
    ComentarioIncidenteItem,
    DashboardStats,
    EvolucionPunto,
    HistorialEvento,
    IncidenteAsignacionUpdate,
    IncidenteCreated,
    IncidenteCreateInput,
    IncidenteDetail,
    IncidenteEstadoUpdate,
    IncidenteListItem,
    IncidenteMapaItem,
    IncidenteMapaResponse,
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
        self._auditoria = AuditoriaRepository(db)
        self._notificaciones = NotificacionRepository(db)

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
        comentarios_rows = await self._repo.list_comentarios(
            incidente_id,
            include_internal=True,
        )

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
    ) -> IncidenteCreated:
        creado = await self._repo.create_incidente(
            reportante_id=reportante_id,
            data={
                "titulo": data.titulo.strip(),
                "descripcion": data.descripcion.strip(),
                "severidad": data.severidad.value if data.severidad else None,
                "categoria": data.categoria.strip() if data.categoria else None,
                "latitud": data.latitud,
                "longitud": data.longitud,
                "lugar_referencia": (
                    data.lugar_referencia.strip() if data.lugar_referencia else None
                ),
                "canal_origen": "WEB",
            },
        )
        await self._registrar_auditoria_incidente(
            usuario_id=reportante_id,
            accion="crear_incidente",
            incidente_id=creado["id"],
            detalle={
                "codigo": creado["codigo"],
                "estado": creado["estado"],
                "canal_origen": "WEB",
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
