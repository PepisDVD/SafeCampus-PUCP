"""
Business logic for campus alert lifecycle, segmentation and delivery.
"""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditEntidad, AuditModulo, AuditOrigen, AuditResultado
from app.core.config import settings
from app.core.constants import CanalNotificacion, EstadoAlertaCampus
from app.integrations.messaging.evolution_client import EvolutionApiClient
from app.repositories.alerta_repository import AlertaRepository
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.notificacion_repository import NotificacionRepository
from app.schemas.alerta import (
    AlertaCreateInput,
    AlertaDestinatarioItem,
    AlertaDestinatariosResponse,
    AlertaDetail,
    AlertaEntregaItem,
    AlertaEventoItem,
    AlertaListItem,
    AlertaListResponse,
    AlertaPublishResponse,
    AlertaSegmentoItem,
    AlertaUpdateInput,
    AlertasStatsResponse,
)


class AlertaService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = AlertaRepository(db)
        self._audit = AuditoriaRepository(db)
        self._notificaciones = NotificacionRepository(db)
        self._evolution = EvolutionApiClient()

    async def listar(
        self,
        *,
        search: str | None = None,
        estado: str | None = None,
        severidad: str | None = None,
        limit: int = 100,
    ) -> AlertaListResponse:
        rows = await self._repo.list_alertas(
            search=search,
            estado=estado,
            severidad=severidad,
            limit=max(1, min(limit, 200)),
        )
        return AlertaListResponse(items=[self._map_list_item(row) for row in rows], total=len(rows))

    async def listar_destinatarios(
        self, *, search: str | None = None, limit: int = 100
    ) -> AlertaDestinatariosResponse:
        rows = await self._repo.list_usuarios_comunidad(
            search=search, limit=max(1, min(limit, 200))
        )
        items = [
            AlertaDestinatarioItem(
                id=str(row["id"]),
                nombre=row["nombre"],
                apellido=row["apellido"],
                email=row["email"],
            )
            for row in rows
        ]
        return AlertaDestinatariosResponse(items=items, total=len(items))

    async def obtener(self, alerta_id: str) -> AlertaDetail:
        self._validate_uuid(alerta_id)
        row = await self._repo.get_alerta(alerta_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada.")
        return await self._hydrate_detail(row)

    async def crear(self, *, body: AlertaCreateInput, actor_id: str) -> AlertaDetail:
        self._validate_location(body.latitud, body.longitud)
        row = await self._repo.create_alerta(
            data={
                "tipo": body.tipo.strip() or "ALR-MAS-SEG",
                "familia": body.familia.strip() or "A",
                "titulo": body.titulo.strip(),
                "contenido": body.contenido.strip(),
                "severidad": body.severidad.value,
                "origen": body.origen.value,
                "canales": [c.value for c in body.canales],
                "zona_id": body.zona_id,
                "latitud": body.latitud,
                "longitud": body.longitud,
                "radio_metros": body.radio_metros,
                "fecha_programada": body.fecha_programada,
                "fecha_fin": body.fecha_fin,
                "created_by_id": actor_id,
            },
            segmentos=[self._segmento_to_dict(item) for item in body.segmentos],
        )
        await self._audit_alerta(
            actor_id=actor_id,
            accion="crear_alerta",
            alerta_id=str(row["id"]),
            detalle={"codigo_entidad": row["codigo"], "estado": row["estado"]},
        )
        return await self._hydrate_detail(row)

    async def actualizar(self, *, alerta_id: str, body: AlertaUpdateInput, actor_id: str) -> AlertaDetail:
        self._validate_uuid(alerta_id)
        self._validate_location(body.latitud, body.longitud)
        data = body.model_dump(exclude_unset=True, exclude={"segmentos"})
        if "severidad" in data and data["severidad"] is not None:
            data["severidad"] = data["severidad"].value
        if "origen" in data and data["origen"] is not None:
            data["origen"] = data["origen"].value
        if "canales" in data and data["canales"] is not None:
            data["canales"] = [c.value for c in data["canales"]]
        for key in ("titulo", "contenido"):
            if key in data and isinstance(data[key], str):
                data[key] = data[key].strip()
        segmentos = None
        if body.segmentos is not None:
            segmentos = [self._segmento_to_dict(item) for item in body.segmentos]
        row = await self._repo.update_alerta(alerta_id, data=data, segmentos=segmentos)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Solo se pueden editar alertas en borrador o programadas.",
            )
        await self._repo.add_evento(
            alerta_id=alerta_id,
            tipo_evento="EDITADA",
            actor_usuario_id=actor_id,
            detalle={"campos": sorted(data.keys())},
        )
        await self._audit_alerta(
            actor_id=actor_id,
            accion="editar_alerta",
            alerta_id=alerta_id,
            detalle={"codigo_entidad": row["codigo"], "campos": sorted(data.keys())},
        )
        return await self._hydrate_detail(row)

    async def publicar(self, *, alerta_id: str, actor_id: str) -> AlertaPublishResponse:
        detail = await self.obtener(alerta_id)
        if detail.estado not in {EstadoAlertaCampus.BORRADOR, EstadoAlertaCampus.PROGRAMADA, EstadoAlertaCampus.ACTIVA}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La alerta no esta en un estado publicable.",
            )
        destinatarios = await self._repo.resolve_destinatarios(alerta_id)
        if not destinatarios:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La segmentacion no encontro destinatarios activos.",
            )

        sent = 0
        failed = 0
        created = 0
        for destinatario in destinatarios:
            for canal in detail.canales:
                estado, notificacion_id, external_id, error = await self._deliver(
                    alerta=detail,
                    destinatario=destinatario,
                    canal=canal.value,
                )
                await self._repo.create_entrega(
                    alerta_id=alerta_id,
                    destinatario_id=str(destinatario["id"]),
                    canal=canal.value,
                    estado=estado,
                    notificacion_id=notificacion_id,
                    external_message_id=external_id,
                    error_detalle=error,
                )
                created += 1
                if estado == "ENVIADA":
                    sent += 1
                if estado == "FALLIDA":
                    failed += 1

        await self._repo.set_estado(alerta_id, estado="ACTIVA", actor_id=actor_id)
        await self._repo.add_evento(
            alerta_id=alerta_id,
            tipo_evento="PUBLICADA",
            actor_usuario_id=actor_id,
            detalle={
                "destinatarios": len(destinatarios),
                "entregas_creadas": created,
                "entregas_enviadas": sent,
                "entregas_fallidas": failed,
            },
        )
        await self._audit_alerta(
            actor_id=actor_id,
            accion="publicar_alerta",
            alerta_id=alerta_id,
            detalle={"codigo_entidad": detail.codigo, "entregas": created, "fallidas": failed},
        )
        return AlertaPublishResponse(
            alerta=await self.obtener(alerta_id),
            destinatarios=len(destinatarios),
            entregas_creadas=created,
            entregas_enviadas=sent,
            entregas_fallidas=failed,
        )

    async def cancelar(self, *, alerta_id: str, actor_id: str, comentario: str | None) -> AlertaDetail:
        await self.obtener(alerta_id)
        await self._repo.set_estado(alerta_id, estado="CANCELADA", actor_id=actor_id)
        await self._repo.add_evento(
            alerta_id=alerta_id,
            tipo_evento="CANCELADA",
            actor_usuario_id=actor_id,
            detalle={"comentario": comentario},
        )
        await self._audit_alerta(
            actor_id=actor_id,
            accion="cancelar_alerta",
            alerta_id=alerta_id,
            detalle={"comentario": comentario},
        )
        return await self.obtener(alerta_id)

    async def finalizar(self, *, alerta_id: str, actor_id: str, comentario: str | None) -> AlertaDetail:
        await self.obtener(alerta_id)
        await self._repo.set_estado(alerta_id, estado="ATENDIDA", actor_id=actor_id)
        await self._repo.add_evento(
            alerta_id=alerta_id,
            tipo_evento="FINALIZADA",
            actor_usuario_id=actor_id,
            detalle={"comentario": comentario},
        )
        await self._audit_alerta(
            actor_id=actor_id,
            accion="finalizar_alerta",
            alerta_id=alerta_id,
            detalle={"comentario": comentario},
        )
        return await self.obtener(alerta_id)

    async def _audit_alerta(
        self,
        *,
        actor_id: str,
        accion: str,
        alerta_id: str,
        detalle: dict[str, Any],
    ) -> None:
        detalle_estandar = {
            "origen": AuditOrigen.WEB.value,
            "resultado": AuditResultado.EXITOSO.value,
            **detalle,
        }
        await self._audit.create_registro(
            usuario_id=actor_id,
            modulo=AuditModulo.ALERTAS,
            accion=accion,
            entidad=AuditEntidad.ALERTA,
            entidad_id=alerta_id,
            detalle=detalle_estandar,
        )

    async def stats(self) -> AlertasStatsResponse:
        raw = await self._repo.stats()
        por_estado: dict[str, int] = {}
        por_severidad: dict[str, int] = {}
        total_alertas = 0
        for row in raw["alertas"]:
            count = int(row["total"] or 0)
            total_alertas += count
            por_estado[str(row["estado"])] = por_estado.get(str(row["estado"]), 0) + count
            por_severidad[str(row["severidad"])] = por_severidad.get(str(row["severidad"]), 0) + count

        por_canal: dict[str, int] = {}
        entregas_total = 0
        entregas_enviadas = 0
        entregas_fallidas = 0
        for row in raw["entregas"]:
            count = int(row["total"] or 0)
            canal = str(row["canal"])
            estado = str(row["estado"])
            por_canal[canal] = por_canal.get(canal, 0) + count
            entregas_total += count
            if estado == "ENVIADA":
                entregas_enviadas += count
            if estado == "FALLIDA":
                entregas_fallidas += count

        return AlertasStatsResponse(
            total=total_alertas,
            por_estado=por_estado,
            por_canal=por_canal,
            por_severidad=por_severidad,
            entregas_total=entregas_total,
            entregas_enviadas=entregas_enviadas,
            entregas_fallidas=entregas_fallidas,
        )

    async def _deliver(
        self,
        *,
        alerta: AlertaDetail,
        destinatario: dict[str, Any],
        canal: str,
    ) -> tuple[str, str | None, str | None, str | None]:
        contenido = f"{alerta.titulo}\n\n{alerta.contenido}"
        if canal == CanalNotificacion.INAPP.value:
            notificacion_id = await self._notificaciones.create(
                destinatario_id=str(destinatario["id"]),
                tipo_evento="ALERTA_CAMPUS",
                canal="INAPP",
                estado="PENDIENTE",
                asunto=alerta.titulo,
                contenido=alerta.contenido,
            )
            return "ENVIADA", notificacion_id, None, None
        if canal == CanalNotificacion.WHATSAPP.value:
            phone = destinatario.get("telefono")
            if not phone:
                return "FALLIDA", None, None, "Destinatario sin telefono registrado."
            if not settings.EVOLUTION_API_KEY:
                return "FALLIDA", None, None, "EVOLUTION_API_KEY no esta configurado."
            try:
                response = await self._evolution.send_text(chat_id=str(phone), text=contenido)
            except Exception as exc:
                return "FALLIDA", None, None, str(exc)
            return "ENVIADA", None, self._extract_external_id(response), None
        return "DESCARTADA", None, None, f"Canal {canal} sin adaptador activo."

    async def _hydrate_detail(self, row: dict[str, Any]) -> AlertaDetail:
        alerta_id = str(row["id"])
        return AlertaDetail(
            **self._map_list_item(row).model_dump(),
            segmentos=[self._map_segmento(item) for item in await self._repo.list_segmentos(alerta_id)],
            entregas=[self._map_entrega(item) for item in await self._repo.list_entregas(alerta_id)],
            eventos=[self._map_evento(item) for item in await self._repo.list_eventos(alerta_id)],
        )

    @staticmethod
    def _segmento_to_dict(item: Any) -> dict[str, Any]:
        return {
            "tipo": item.tipo.value,
            "valor": item.valor.strip(),
            "usuario_id": item.usuario_id,
            "ubicacion_id": item.ubicacion_id,
            "radio_metros": item.radio_metros,
        }

    @staticmethod
    def _map_list_item(row: dict[str, Any]) -> AlertaListItem:
        return AlertaListItem(
            id=str(row["id"]),
            codigo=str(row["codigo"]),
            tipo=str(row.get("tipo") or "ALR-MAS-SEG"),
            familia=str(row.get("familia") or "A"),
            titulo=str(row["titulo"]),
            contenido=str(row["contenido"]),
            severidad=row["severidad"],
            estado=row["estado"],
            origen=row.get("origen") or "MANUAL",
            canales=row.get("canales") or ["INAPP"],
            zona_id=str(row["zona_id"]) if row.get("zona_id") else None,
            zona_nombre=row.get("zona_nombre"),
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
            radio_metros=row.get("radio_metros"),
            fecha_programada=row.get("fecha_programada"),
            fecha_inicio=row.get("fecha_inicio"),
            fecha_fin=row.get("fecha_fin"),
            created_by_id=str(row["created_by_id"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            entregas_total=int(row.get("entregas_total") or 0),
            entregas_enviadas=int(row.get("entregas_enviadas") or 0),
            entregas_fallidas=int(row.get("entregas_fallidas") or 0),
        )

    @staticmethod
    def _map_segmento(row: dict[str, Any]) -> AlertaSegmentoItem:
        return AlertaSegmentoItem(
            id=str(row["id"]),
            tipo=row["tipo"],
            valor=str(row["valor"]),
            usuario_id=str(row["usuario_id"]) if row.get("usuario_id") else None,
            ubicacion_id=str(row["ubicacion_id"]) if row.get("ubicacion_id") else None,
            radio_metros=row.get("radio_metros"),
        )

    @staticmethod
    def _map_entrega(row: dict[str, Any]) -> AlertaEntregaItem:
        return AlertaEntregaItem(
            id=str(row["id"]),
            destinatario_id=str(row["destinatario_id"]) if row.get("destinatario_id") else None,
            destinatario_nombre=row.get("destinatario_nombre"),
            destinatario_email=row.get("destinatario_email"),
            canal=row["canal"],
            estado=row["estado"],
            error_detalle=row.get("error_detalle"),
            fecha_envio=row.get("fecha_envio"),
            created_at=row["created_at"],
        )

    @staticmethod
    def _map_evento(row: dict[str, Any]) -> AlertaEventoItem:
        return AlertaEventoItem(
            id=str(row["id"]),
            tipo_evento=str(row["tipo_evento"]),
            actor_usuario_id=str(row["actor_usuario_id"]) if row.get("actor_usuario_id") else None,
            actor_nombre=row.get("actor_nombre"),
            detalle=row.get("detalle") or {},
            created_at=row["created_at"],
        )

    @staticmethod
    def _validate_uuid(value: str) -> None:
        try:
            UUID(value)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID invalido.") from exc

    @staticmethod
    def _validate_location(latitud: float | None, longitud: float | None) -> None:
        if (latitud is None) != (longitud is None):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Latitud y longitud deben enviarse juntas.",
            )

    @staticmethod
    def _extract_external_id(response: dict[str, Any]) -> str | None:
        for key in ("id", "messageId", "key"):
            value = response.get(key)
            if isinstance(value, str):
                return value
            if isinstance(value, dict) and isinstance(value.get("id"), str):
                return value["id"]
        return None
