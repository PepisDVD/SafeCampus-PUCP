"""Repository for sc_omnicanal webhook ingestion."""

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Date, Integer, and_, cast, delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.sc_incidentes import Incidente
from app.models.sc_omnicanal import (
    CanalReporte,
    ChatbotEstadoConversacion,
    ChatbotLlmUsage,
    Conversacion,
    ConversacionCiclo,
    ConversacionIncidenteHistorial,
    ConversacionOperadorAsignado,
    EventoConversacion,
    MensajeConversacion,
    ReporteEntrante,
)
from app.models.sc_users import Usuario


class OmnicanalRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _conversation_projection(self):
        operador = aliased(Usuario, name="operador")
        tomado_por = aliased(Usuario, name="tomado_por")
        active_cycle_id = (
            select(ConversacionCiclo.id)
            .where(
                and_(
                    ConversacionCiclo.conversacion_id == Conversacion.id,
                    ConversacionCiclo.estado == "ACTIVO",
                )
            )
            .limit(1)
            .correlate(Conversacion)
            .scalar_subquery()
        )
        historico_count = (
            select(func.count(ConversacionIncidenteHistorial.id))
            .where(ConversacionIncidenteHistorial.conversacion_id == Conversacion.id)
            .correlate(Conversacion)
            .scalar_subquery()
        )
        latest_history_id = (
            select(ConversacionIncidenteHistorial.incidente_id)
            .where(
                and_(
                    ConversacionIncidenteHistorial.conversacion_id == Conversacion.id,
                    ConversacionIncidenteHistorial.incidente_id.is_not(None),
                )
            )
            .order_by(ConversacionIncidenteHistorial.asociado_at.desc())
            .limit(1)
            .correlate(Conversacion)
            .scalar_subquery()
        )
        latest_message_author = (
            select(MensajeConversacion.autor_tipo)
            .where(
                and_(
                    MensajeConversacion.conversacion_id == Conversacion.id,
                    MensajeConversacion.ciclo_id == active_cycle_id,
                )
            )
            .order_by(MensajeConversacion.created_at.desc())
            .limit(1)
            .correlate(Conversacion)
            .scalar_subquery()
        )
        ultimo_incidente = aliased(Incidente, name="ultimo_incidente")
        return (
            select(
                Conversacion,
                ChatbotEstadoConversacion,
                operador.id.label("operador_id"),
                operador.nombre.label("operador_nombre"),
                operador.apellido.label("operador_apellido"),
                operador.email.label("operador_email"),
                operador.avatar_url.label("operador_avatar_url"),
                tomado_por.id.label("tomado_por_id"),
                tomado_por.nombre.label("tomado_por_nombre"),
                tomado_por.apellido.label("tomado_por_apellido"),
                tomado_por.email.label("tomado_por_email"),
                tomado_por.avatar_url.label("tomado_por_avatar_url"),
                Incidente.id.label("incidente_id"),
                Incidente.codigo.label("incidente_codigo"),
                Incidente.titulo.label("incidente_titulo"),
                Incidente.estado.label("incidente_estado"),
                Incidente.severidad.label("incidente_severidad"),
                latest_message_author.label("ultimo_mensaje_autor_tipo"),
                historico_count.label("historico_incidentes_count"),
                ultimo_incidente.id.label("ultimo_incidente_id"),
                ultimo_incidente.codigo.label("ultimo_incidente_codigo"),
                ultimo_incidente.titulo.label("ultimo_incidente_titulo"),
                ultimo_incidente.estado.label("ultimo_incidente_estado"),
                ultimo_incidente.severidad.label("ultimo_incidente_severidad"),
            )
            .outerjoin(operador, operador.id == Conversacion.operador_asignado_id)
            .outerjoin(tomado_por, tomado_por.id == Conversacion.tomado_por_id)
            .outerjoin(Incidente, Incidente.id == Conversacion.incidente_id)
            .outerjoin(ultimo_incidente, ultimo_incidente.id == latest_history_id)
            .outerjoin(
                ChatbotEstadoConversacion,
                ChatbotEstadoConversacion.conversacion_id == Conversacion.id,
            )
        )

    async def get_active_cycle(self, conversacion_id: str | Any) -> ConversacionCiclo | None:
        conversation_uuid = conversacion_id if isinstance(conversacion_id, UUID) else UUID(str(conversacion_id))
        statement = (
            select(ConversacionCiclo)
            .where(
                ConversacionCiclo.conversacion_id == conversation_uuid,
                ConversacionCiclo.estado == "ACTIVO",
            )
            .limit(1)
        )
        return await self.db.scalar(statement)

    async def get_or_create_active_cycle(
        self,
        conversacion_id: str | Any,
        *,
        incidente_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ConversacionCiclo:
        existing = await self.get_active_cycle(conversacion_id)
        if existing:
            if incidente_id and not existing.incidente_id:
                existing.incidente_id = UUID(incidente_id)
                await self.db.flush()
                await self.db.refresh(existing)
            return existing

        conversation_uuid = conversacion_id if isinstance(conversacion_id, UUID) else UUID(str(conversacion_id))
        cycle = ConversacionCiclo(
            conversacion_id=conversation_uuid,
            incidente_id=UUID(incidente_id) if incidente_id else None,
            estado="ACTIVO",
            metadatos=metadata or {},
        )
        self.db.add(cycle)
        await self.db.flush()
        await self.db.refresh(cycle)
        return cycle

    async def get_or_create_whatsapp_channel(
        self,
        *,
        provider: str,
        instance_name: str | None,
    ) -> CanalReporte:
        channel_name = f"WhatsApp {provider}".strip()
        statement = (
            select(CanalReporte)
            .where(
                CanalReporte.nombre == channel_name,
                CanalReporte.tipo == "MENSAJERIA",
            )
            .limit(1)
        )
        channel = await self.db.scalar(statement)
        if channel:
            return channel

        channel = CanalReporte(
            nombre=channel_name,
            tipo="MENSAJERIA",
            activo=True,
            configuracion={
                "provider": provider,
                "instance_name": instance_name,
            },
        )
        self.db.add(channel)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def create_reporte_entrante(
        self,
        *,
        canal_id: Any,
        contenido_raw: dict[str, Any],
        metadatos_canal: dict[str, Any],
        ip_origen: str | None,
        user_agent: str | None,
    ) -> ReporteEntrante:
        reporte = ReporteEntrante(
            canal_id=canal_id,
            contenido_raw=json.dumps(contenido_raw, ensure_ascii=True, default=str),
            metadatos_canal=metadatos_canal,
            estado="NORMALIZADO",
            ip_origen=ip_origen,
            user_agent=user_agent,
        )
        self.db.add(reporte)
        await self.db.flush()
        await self.db.refresh(reporte)
        return reporte

    async def get_or_create_conversacion(
        self,
        *,
        canal_id: Any,
        external_chat_id: str,
        telefono_contacto: str | None,
        nombre_contacto: str | None,
        metadatos: dict[str, Any],
    ) -> Conversacion:
        statement = (
            select(Conversacion)
            .where(
                Conversacion.canal_id == canal_id,
                Conversacion.external_chat_id == external_chat_id,
            )
            .limit(1)
        )
        conversacion = await self.db.scalar(statement)
        if conversacion:
            updates: dict[str, Any] = {}
            if nombre_contacto and not conversacion.nombre_contacto:
                updates["nombre_contacto"] = nombre_contacto
            if telefono_contacto and not conversacion.telefono_contacto:
                updates["telefono_contacto"] = telefono_contacto
            if updates:
                for key, value in updates.items():
                    setattr(conversacion, key, value)
                await self.db.flush()
            return conversacion

        conversacion = Conversacion(
            canal_id=canal_id,
            external_chat_id=external_chat_id,
            telefono_contacto=telefono_contacto,
            nombre_contacto=nombre_contacto,
            estado="EN_BOT",
            modo_atencion="BOT",
            prioridad="MEDIO",
            ultimo_mensaje_preview="",
            metadatos=metadatos,
        )
        self.db.add(conversacion)
        await self.db.flush()
        await self.db.refresh(conversacion)
        await self.get_or_create_active_cycle(conversacion.id, metadata={"created_from": "whatsapp_webhook"})
        return conversacion

    async def create_mensaje_if_missing(
        self,
        *,
        conversacion_id: Any,
        external_message_id: str | None,
        direccion: str,
        autor_tipo: str,
        autor_usuario_id: str | None = None,
        contenido: str | None,
        tipo_contenido: str,
        estado_entrega: str,
        payload_raw: dict[str, Any],
        ciclo_id: str | None = None,
    ) -> MensajeConversacion | None:
        ciclo = None
        if ciclo_id:
            ciclo = await self.db.get(ConversacionCiclo, UUID(ciclo_id))
        else:
            ciclo = await self.get_active_cycle(conversacion_id)
            if not ciclo:
                conversation = await self.db.get(
                    Conversacion,
                    conversacion_id if isinstance(conversacion_id, UUID) else UUID(str(conversacion_id)),
                )
                if conversation and conversation.estado != "CERRADA":
                    ciclo = await self.get_or_create_active_cycle(conversacion_id)
        values = {
            "conversacion_id": conversacion_id,
            "ciclo_id": ciclo.id if ciclo else None,
            "external_message_id": external_message_id,
            "direccion": direccion,
            "autor_tipo": autor_tipo,
            "autor_usuario_id": UUID(autor_usuario_id) if autor_usuario_id else None,
            "contenido": contenido,
            "tipo_contenido": tipo_contenido,
            "estado_entrega": estado_entrega,
            "payload_raw": payload_raw,
        }
        if external_message_id:
            statement = (
                insert(MensajeConversacion)
                .values(**values)
                .on_conflict_do_nothing(
                    constraint="uq_mensaje_conversacion_external",
                )
                .returning(MensajeConversacion.id)
            )
            result = await self.db.execute(statement)
            inserted_id = result.scalar_one_or_none()
            if not inserted_id:
                return None
            await self.db.flush()
            return await self.db.get(MensajeConversacion, inserted_id)

        mensaje = MensajeConversacion(**values)
        self.db.add(mensaje)
        await self.db.flush()
        await self.db.refresh(mensaje)
        return mensaje

    async def update_conversacion_after_message(
        self,
        *,
        conversacion_id: Any,
        preview: str,
        modo_atencion: str | None = None,
        estado: str | None = None,
        prioridad: str | None = None,
        incidente_id: str | None = None,
    ) -> Conversacion:
        values: dict[str, Any] = {
            "ultimo_mensaje_preview": preview[:500],
            "ultimo_mensaje_at": func.now(),
            "updated_at": func.now(),
        }
        if modo_atencion:
            values["modo_atencion"] = modo_atencion
        if estado:
            values["estado"] = estado
        if prioridad:
            values["prioridad"] = prioridad
        if incidente_id:
            values["incidente_id"] = UUID(incidente_id)
        statement = (
            update(Conversacion)
            .where(Conversacion.id == conversacion_id)
            .values(**values)
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one()

    async def create_evento(
        self,
        *,
        conversacion_id: Any,
        tipo_evento: str,
        actor_usuario_id: str | None = None,
        payload: dict[str, Any] | None = None,
        ciclo_id: str | None = None,
    ) -> EventoConversacion:
        ciclo = await self.db.get(ConversacionCiclo, UUID(ciclo_id)) if ciclo_id else await self.get_active_cycle(conversacion_id)
        if not ciclo:
            conversation = await self.db.get(
                Conversacion,
                conversacion_id if isinstance(conversacion_id, UUID) else UUID(str(conversacion_id)),
            )
            if conversation and conversation.estado != "CERRADA":
                ciclo = await self.get_or_create_active_cycle(conversacion_id)
        evento = EventoConversacion(
            conversacion_id=conversacion_id,
            ciclo_id=ciclo.id if ciclo else None,
            tipo_evento=tipo_evento,
            actor_usuario_id=UUID(actor_usuario_id) if actor_usuario_id else None,
            payload=payload or {},
        )
        self.db.add(evento)
        await self.db.flush()
        await self.db.refresh(evento)
        return evento

    async def ensure_incident_association(
        self,
        *,
        conversacion_id: str,
        incidente_id: str,
        actor_usuario_id: str | None = None,
        actor_tipo: str = "SISTEMA",
        tipo_asociacion: str = "LEGACY",
    ) -> None:
        existing = await self.db.scalar(
            select(ConversacionIncidenteHistorial.id)
            .where(
                and_(
                    ConversacionIncidenteHistorial.conversacion_id == UUID(conversacion_id),
                    ConversacionIncidenteHistorial.incidente_id == UUID(incidente_id),
                    ConversacionIncidenteHistorial.finalizado_at.is_(None),
                )
            )
            .limit(1)
        )
        if existing:
            return
        self.db.add(
            ConversacionIncidenteHistorial(
                conversacion_id=UUID(conversacion_id),
                incidente_id=UUID(incidente_id),
                actor_usuario_id=UUID(actor_usuario_id) if actor_usuario_id else None,
                actor_tipo=actor_tipo,
                tipo_asociacion=tipo_asociacion,
            )
        )
        await self.db.flush()

    async def replace_active_incident_association(
        self,
        *,
        conversacion_id: str,
        incidente_id: str,
        actor_usuario_id: str | None = None,
        actor_tipo: str,
        tipo_asociacion: str,
    ) -> None:
        await self.close_active_incident_association(
            conversacion_id=conversacion_id,
            motivo="REEMPLAZADO",
        )
        await self.ensure_incident_association(
            conversacion_id=conversacion_id,
            incidente_id=incidente_id,
            actor_usuario_id=actor_usuario_id,
            actor_tipo=actor_tipo,
            tipo_asociacion=tipo_asociacion,
        )

    async def close_active_incident_association(
        self,
        *,
        conversacion_id: str,
        motivo: str,
    ) -> None:
        statement = (
            update(ConversacionIncidenteHistorial)
            .where(
                and_(
                    ConversacionIncidenteHistorial.conversacion_id == UUID(conversacion_id),
                    ConversacionIncidenteHistorial.finalizado_at.is_(None),
                )
            )
            .values(finalizado_at=func.now(), motivo_finalizacion=motivo)
        )
        await self.db.execute(statement)
        await self.db.flush()

    async def list_conversaciones(
        self,
        *,
        search: str | None,
        estado: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        statement = self._conversation_projection().order_by(Conversacion.ultimo_mensaje_at.desc()).limit(limit)
        if estado:
            statement = statement.where(Conversacion.estado == estado)
        if search:
            pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    Conversacion.nombre_contacto.ilike(pattern),
                    Conversacion.telefono_contacto.ilike(pattern),
                    Conversacion.external_chat_id.ilike(pattern),
                    Conversacion.ultimo_mensaje_preview.ilike(pattern),
                )
            )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_operadores_asignados(
        self,
        conversacion_ids: list[str],
    ) -> dict[str, list[dict[str, Any]]]:
        if not conversacion_ids:
            return {}
        ids = [UUID(conversacion_id) for conversacion_id in conversacion_ids]
        statement = (
            select(
                ConversacionOperadorAsignado.conversacion_id,
                Usuario.id.label("operador_id"),
                Usuario.nombre.label("operador_nombre"),
                Usuario.apellido.label("operador_apellido"),
                Usuario.email.label("operador_email"),
                Usuario.avatar_url.label("operador_avatar_url"),
            )
            .join(Usuario, Usuario.id == ConversacionOperadorAsignado.operador_id)
            .where(ConversacionOperadorAsignado.conversacion_id.in_(ids))
            .order_by(ConversacionOperadorAsignado.created_at.asc())
        )
        result = await self.db.execute(statement)
        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in result.mappings():
            grouped.setdefault(str(row["conversacion_id"]), []).append(dict(row))
        return grouped

    async def list_conversaciones_historial(
        self,
        *,
        search: str | None,
        desde: str | None,
        hasta: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        incident_count = func.count(ConversacionIncidenteHistorial.id)
        statement = (
            select(
                Conversacion,
                incident_count.label("incidentes_count"),
                func.max(ConversacionIncidenteHistorial.asociado_at).label("ultimo_incidente_at"),
            )
            .outerjoin(
                ConversacionIncidenteHistorial,
                ConversacionIncidenteHistorial.conversacion_id == Conversacion.id,
            )
            .group_by(Conversacion.id)
            .having(or_(Conversacion.estado == "CERRADA", incident_count > 0))
            .order_by(Conversacion.ultimo_mensaje_at.desc())
            .limit(limit)
        )
        if search:
            pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    Conversacion.nombre_contacto.ilike(pattern),
                    Conversacion.telefono_contacto.ilike(pattern),
                    Conversacion.external_chat_id.ilike(pattern),
                )
            )
        if desde:
            statement = statement.where(cast(Conversacion.ultimo_mensaje_at, Date) >= desde)
        if hasta:
            statement = statement.where(cast(Conversacion.ultimo_mensaje_at, Date) <= hasta)
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_conversacion_historial(self, conversacion_id: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
        detail = await self.get_conversacion_detail(conversacion_id)
        actor = aliased(Usuario, name="hist_actor")
        statement = (
            select(
                ConversacionIncidenteHistorial,
                Incidente.id.label("incidente_id"),
                Incidente.codigo.label("incidente_codigo"),
                Incidente.titulo.label("incidente_titulo"),
                Incidente.estado.label("incidente_estado"),
                Incidente.severidad.label("incidente_severidad"),
                actor.id.label("actor_id"),
                actor.nombre.label("actor_nombre"),
                actor.apellido.label("actor_apellido"),
                actor.email.label("actor_email"),
                actor.avatar_url.label("actor_avatar_url"),
            )
            .outerjoin(Incidente, Incidente.id == ConversacionIncidenteHistorial.incidente_id)
            .outerjoin(actor, actor.id == ConversacionIncidenteHistorial.actor_usuario_id)
            .where(ConversacionIncidenteHistorial.conversacion_id == UUID(conversacion_id))
            .order_by(ConversacionIncidenteHistorial.asociado_at.asc())
        )
        result = await self.db.execute(statement)
        return detail, [dict(row) for row in result.mappings()]

    async def count_conversaciones(self, *, search: str | None, estado: str | None) -> int:
        statement = select(func.count()).select_from(Conversacion)
        if estado:
            statement = statement.where(Conversacion.estado == estado)
        if search:
            pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    Conversacion.nombre_contacto.ilike(pattern),
                    Conversacion.telefono_contacto.ilike(pattern),
                    Conversacion.external_chat_id.ilike(pattern),
                    Conversacion.ultimo_mensaje_preview.ilike(pattern),
                )
            )
        return int(await self.db.scalar(statement) or 0)

    async def get_conversacion_detail(self, conversacion_id: str) -> dict[str, Any] | None:
        statement = self._conversation_projection().where(Conversacion.id == UUID(conversacion_id)).limit(1)
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        if not row:
            return None
        return dict(row)

    async def get_or_create_chatbot_state(self, conversacion_id: str) -> ChatbotEstadoConversacion:
        statement = (
            select(ChatbotEstadoConversacion)
            .where(ChatbotEstadoConversacion.conversacion_id == UUID(conversacion_id))
            .limit(1)
        )
        chatbot_state = await self.db.scalar(statement)
        if chatbot_state:
            return chatbot_state

        chatbot_state = ChatbotEstadoConversacion(conversacion_id=UUID(conversacion_id))
        self.db.add(chatbot_state)
        await self.db.flush()
        await self.db.refresh(chatbot_state)
        return chatbot_state

    async def update_chatbot_state(
        self,
        conversacion_id: str,
        data: dict[str, Any],
    ) -> ChatbotEstadoConversacion:
        chatbot_state = await self.get_or_create_chatbot_state(conversacion_id)
        for key, value in data.items():
            setattr(chatbot_state, key, value)
        await self.db.flush()
        await self.db.refresh(chatbot_state)
        return chatbot_state

    async def delete_chatbot_state(self, conversacion_id: str) -> None:
        statement = delete(ChatbotEstadoConversacion).where(
            ChatbotEstadoConversacion.conversacion_id == UUID(conversacion_id)
        )
        await self.db.execute(statement)
        await self.db.flush()

    async def create_chatbot_llm_usage(
        self,
        *,
        conversacion_id: str,
        incidente_id: str | None,
        correlation_id: str,
        provider: str,
        model: str,
        prompt_version: str | None,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
        latency_ms: int | None,
        fallback_applied: bool,
        fallback_reason: str | None,
        raw_response: dict[str, Any] | None,
        ciclo_id: str | None = None,
    ) -> ChatbotLlmUsage:
        ciclo = await self.db.get(ConversacionCiclo, UUID(ciclo_id)) if ciclo_id else await self.get_active_cycle(conversacion_id)
        if not ciclo:
            conversation = await self.db.get(Conversacion, UUID(conversacion_id))
            if conversation and conversation.estado != "CERRADA":
                ciclo = await self.get_or_create_active_cycle(conversacion_id)
        usage = ChatbotLlmUsage(
            conversacion_id=UUID(conversacion_id),
            ciclo_id=ciclo.id if ciclo else None,
            incidente_id=UUID(incidente_id) if incidente_id else None,
            correlation_id=correlation_id,
            provider=provider,
            model=model,
            prompt_version=prompt_version,
            prompt_tokens=max(0, int(prompt_tokens)),
            completion_tokens=max(0, int(completion_tokens)),
            total_tokens=max(0, int(total_tokens)),
            latency_ms=latency_ms,
            fallback_applied=fallback_applied,
            fallback_reason=fallback_reason,
            raw_response=raw_response or {},
        )
        self.db.add(usage)
        await self.db.flush()
        await self.db.refresh(usage)
        return usage

    async def update_conversacion_chatbot_routing(
        self,
        conversacion_id: str,
        *,
        prioridad: str | None = None,
        estado: str | None = None,
        modo_atencion: str | None = None,
        incidente_id: str | None = None,
    ) -> Conversacion | None:
        values: dict[str, Any] = {"updated_at": func.now()}
        if prioridad is not None:
            values["prioridad"] = prioridad
        if estado is not None:
            values["estado"] = estado
        if modo_atencion is not None:
            values["modo_atencion"] = modo_atencion
        if incidente_id is not None:
            values["incidente_id"] = UUID(incidente_id)
            cycle = await self.get_active_cycle(conversacion_id)
            if cycle and not cycle.incidente_id:
                cycle.incidente_id = UUID(incidente_id)
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(**values)
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def list_mensajes(self, conversacion_id: str, limit: int) -> list[dict[str, Any]]:
        active_cycle = await self.get_active_cycle(conversacion_id)
        if not active_cycle:
            return []
        return await self.list_mensajes_ciclo(str(active_cycle.id), limit=limit)

    async def list_mensajes_ciclo(self, ciclo_id: str, limit: int = 500) -> list[dict[str, Any]]:
        statement = (
            select(
                MensajeConversacion,
                Usuario.id.label("autor_id"),
                Usuario.nombre.label("autor_nombre"),
                Usuario.apellido.label("autor_apellido"),
                Usuario.email.label("autor_email"),
                Usuario.avatar_url.label("autor_avatar_url"),
            )
            .outerjoin(Usuario, Usuario.id == MensajeConversacion.autor_usuario_id)
            .where(MensajeConversacion.ciclo_id == UUID(ciclo_id))
            .order_by(MensajeConversacion.created_at.asc())
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_eventos(self, conversacion_id: str, limit: int) -> list[dict[str, Any]]:
        active_cycle = await self.get_active_cycle(conversacion_id)
        if not active_cycle:
            return []
        return await self.list_eventos_ciclo(str(active_cycle.id), limit=limit)

    async def list_eventos_ciclo(self, ciclo_id: str, limit: int = 300) -> list[dict[str, Any]]:
        statement = (
            select(
                EventoConversacion,
                Usuario.id.label("actor_id"),
                Usuario.nombre.label("actor_nombre"),
                Usuario.apellido.label("actor_apellido"),
                Usuario.email.label("actor_email"),
                Usuario.avatar_url.label("actor_avatar_url"),
            )
            .outerjoin(Usuario, Usuario.id == EventoConversacion.actor_usuario_id)
            .where(EventoConversacion.ciclo_id == UUID(ciclo_id))
            .order_by(EventoConversacion.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def assign_conversacion(
        self,
        conversacion_id: str,
        operador_ids: list[str],
        actor_id: str,
    ) -> Conversacion | None:
        unique_operator_ids = list(dict.fromkeys(operador_ids))
        primary_operator_id = unique_operator_ids[0] if unique_operator_ids else None
        await self.db.execute(
            delete(ConversacionOperadorAsignado).where(
                ConversacionOperadorAsignado.conversacion_id == UUID(conversacion_id)
            )
        )
        if unique_operator_ids:
            self.db.add_all(
                [
                    ConversacionOperadorAsignado(
                        conversacion_id=UUID(conversacion_id),
                        operador_id=UUID(operator_id),
                        asignado_por_id=UUID(actor_id),
                    )
                    for operator_id in unique_operator_ids
                ]
            )
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(
                operador_asignado_id=UUID(primary_operator_id) if primary_operator_id else None,
                estado="EN_ATENCION",
                modo_atencion="HUMANO",
                updated_at=func.now(),
            )
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def tomar_conversacion(
        self,
        conversacion_id: str,
        usuario_id: str,
    ) -> Conversacion | None:
        await self.db.execute(
            delete(ConversacionOperadorAsignado).where(
                ConversacionOperadorAsignado.conversacion_id == UUID(conversacion_id)
            )
        )
        self.db.add(
            ConversacionOperadorAsignado(
                conversacion_id=UUID(conversacion_id),
                operador_id=UUID(usuario_id),
                asignado_por_id=UUID(usuario_id),
            )
        )
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(
                tomado_por_id=UUID(usuario_id),
                operador_asignado_id=UUID(usuario_id),
                tomado_at=func.now(),
                estado="EN_ATENCION",
                modo_atencion="HUMANO",
                updated_at=func.now(),
            )
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def cerrar_conversacion(
        self,
        conversacion_id: str,
        usuario_id: str | None,
        motivo: str | None,
    ) -> Conversacion | None:
        await self.db.execute(
            delete(ConversacionOperadorAsignado).where(
                ConversacionOperadorAsignado.conversacion_id == UUID(conversacion_id)
            )
        )
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(
                estado="CERRADA",
                modo_atencion=None,
                prioridad=None,
                operador_asignado_id=None,
                tomado_por_id=None,
                tomado_at=None,
                incidente_id=None,
                ultimo_mensaje_preview="",
                cerrado_por_id=UUID(usuario_id) if usuario_id else None,
                cerrado_at=func.now(),
                motivo_cierre=motivo,
                updated_at=func.now(),
            )
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def close_active_cycle(
        self,
        *,
        conversacion_id: str,
        usuario_id: str | None,
        motivo: str | None,
        cierre_tipo: str,
        mensajes_snapshot: list[dict[str, Any]],
        eventos_snapshot: list[dict[str, Any]],
        chatbot_snapshot: dict[str, Any] | None,
        asignaciones_snapshot: list[dict[str, Any]],
        clasificacion_snapshot: dict[str, Any] | None,
        metadatos: dict[str, Any] | None = None,
    ) -> ConversacionCiclo | None:
        cycle = await self.get_active_cycle(conversacion_id)
        if not cycle:
            return None

        conversation = await self.db.get(Conversacion, UUID(conversacion_id))
        cycle.estado = "CERRADO"
        cycle.incidente_id = conversation.incidente_id if conversation and conversation.incidente_id else cycle.incidente_id
        cycle.closed_at = datetime.now(UTC)
        cycle.cerrado_por_id = UUID(usuario_id) if usuario_id else None
        cycle.cierre_motivo = motivo
        cycle.cierre_tipo = cierre_tipo
        cycle.mensajes_snapshot = mensajes_snapshot
        cycle.eventos_snapshot = eventos_snapshot
        cycle.chatbot_snapshot = chatbot_snapshot or {}
        cycle.asignaciones_snapshot = asignaciones_snapshot
        cycle.clasificacion_snapshot = clasificacion_snapshot or {}
        cycle.metadatos = {**(cycle.metadatos or {}), **(metadatos or {})}
        cycle.updated_at = datetime.now(UTC)
        await self.db.flush()
        await self.db.refresh(cycle)
        return cycle

    async def reabrir_conversacion(self, conversacion_id: str) -> Conversacion | None:
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(
                estado="EN_COLA",
                modo_atencion="HUMANO",
                prioridad="MEDIO",
                cerrado_por_id=None,
                cerrado_at=None,
                motivo_cierre=None,
                updated_at=func.now(),
            )
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def reabrir_ciclo(self, ciclo_id: str, usuario_id: str) -> Conversacion | None:
        cycle = await self.db.get(ConversacionCiclo, UUID(ciclo_id))
        if not cycle:
            return None
        existing_active = await self.get_active_cycle(cycle.conversacion_id)
        if existing_active and existing_active.id != cycle.id:
            return None

        metadata = dict(cycle.metadatos or {})
        if cycle.closed_at:
            metadata["reopened_from_close"] = {
                "closed_at": cycle.closed_at.isoformat(),
                "cierre_tipo": cycle.cierre_tipo,
                "cierre_motivo": cycle.cierre_motivo,
            }
        metadata["reopened_at"] = datetime.now(UTC).isoformat()
        metadata["reopened_by"] = usuario_id

        latest_message = await self.db.scalar(
            select(MensajeConversacion)
            .where(MensajeConversacion.ciclo_id == cycle.id)
            .order_by(MensajeConversacion.created_at.desc())
            .limit(1)
        )
        preview = latest_message.contenido if latest_message else ""
        latest_at = latest_message.created_at if latest_message else datetime.now(UTC)
        severity = (cycle.clasificacion_snapshot or {}).get("classification_severity") or "MEDIO"

        cycle.estado = "ACTIVO"
        cycle.closed_at = None
        cycle.cerrado_por_id = None
        cycle.cierre_motivo = None
        cycle.cierre_tipo = "REABIERTO"
        cycle.metadatos = metadata
        cycle.updated_at = datetime.now(UTC)

        statement = (
            update(Conversacion)
            .where(Conversacion.id == cycle.conversacion_id)
            .values(
                estado="EN_COLA",
                modo_atencion="HUMANO",
                prioridad=severity if severity in {"BAJO", "MEDIO", "ALTO", "CRITICO"} else "MEDIO",
                incidente_id=cycle.incidente_id,
                cerrado_por_id=None,
                cerrado_at=None,
                motivo_cierre=None,
                ultimo_mensaje_preview=(preview or "")[:500],
                ultimo_mensaje_at=latest_at,
                updated_at=func.now(),
            )
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        await self.db.flush()
        return result.scalar_one_or_none()

    async def set_modo(self, conversacion_id: str, modo: str) -> Conversacion | None:
        estado = "EN_BOT" if modo == "BOT" else "EN_COLA"
        statement = (
            update(Conversacion)
            .where(and_(Conversacion.id == UUID(conversacion_id), Conversacion.estado != "CERRADA"))
            .values(modo_atencion=modo, estado=estado, updated_at=func.now())
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def vincular_incidente(
        self,
        conversacion_id: str,
        incidente_id: str,
    ) -> Conversacion | None:
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(incidente_id=UUID(incidente_id), updated_at=func.now())
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def reactivar_conversacion_nuevo_ciclo(
        self,
        *,
        conversacion_id: str,
        preview: str,
    ) -> Conversacion | None:
        conversacion = await self.db.get(Conversacion, UUID(conversacion_id))
        if not conversacion:
            return None

        metadata = dict(conversacion.metadatos or {})
        metadata["chatbot_cycle_started_at"] = datetime.now(UTC).isoformat()

        conversacion.estado = "EN_BOT"
        conversacion.modo_atencion = "BOT"
        conversacion.prioridad = "MEDIO"
        conversacion.operador_asignado_id = None
        conversacion.tomado_por_id = None
        conversacion.tomado_at = None
        conversacion.incidente_id = None
        conversacion.cerrado_por_id = None
        conversacion.cerrado_at = None
        conversacion.motivo_cierre = None
        conversacion.ultimo_mensaje_preview = preview[:500]
        conversacion.ultimo_mensaje_at = datetime.now(UTC)
        conversacion.updated_at = datetime.now(UTC)
        conversacion.metadatos = metadata

        await self.db.flush()
        await self.db.refresh(conversacion)
        await self.get_or_create_active_cycle(
            str(conversacion.id),
            metadata={"created_from": "new_inbound_cycle", "started_at": metadata["chatbot_cycle_started_at"]},
        )
        return conversacion

    async def list_conversaciones_ciclos(
        self,
        *,
        search: str | None,
        desde: str | None,
        hasta: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        cycles_count = func.count(ConversacionCiclo.id)
        statement = (
            select(
                Conversacion,
                cycles_count.label("ciclos_count"),
                func.max(func.coalesce(ConversacionCiclo.closed_at, ConversacionCiclo.started_at)).label("ultimo_ciclo_at"),
            )
            .join(ConversacionCiclo, ConversacionCiclo.conversacion_id == Conversacion.id)
            .group_by(Conversacion.id)
            .order_by(func.max(func.coalesce(ConversacionCiclo.closed_at, ConversacionCiclo.started_at)).desc())
            .limit(limit)
        )
        if search:
            pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    Conversacion.nombre_contacto.ilike(pattern),
                    Conversacion.telefono_contacto.ilike(pattern),
                    Conversacion.external_chat_id.ilike(pattern),
                )
            )
        if desde:
            statement = statement.where(cast(ConversacionCiclo.started_at, Date) >= desde)
        if hasta:
            statement = statement.where(cast(ConversacionCiclo.started_at, Date) <= hasta)
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_conversacion_ciclos(self, conversacion_id: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
        summary_rows = await self.list_conversaciones_ciclos(search=None, desde=None, hasta=None, limit=1000)
        summary = next((row for row in summary_rows if str(row["Conversacion"].id) == conversacion_id), None)
        if not summary:
            conversation = await self.db.get(Conversacion, UUID(conversacion_id))
            if not conversation:
                return None, []
            summary = {"Conversacion": conversation, "ciclos_count": 0, "ultimo_ciclo_at": None}
        rows = await self.list_ciclos_for_conversacion(conversacion_id)
        return summary, rows

    async def list_ciclos_for_conversacion(self, conversacion_id: str) -> list[dict[str, Any]]:
        closed_by = aliased(Usuario, name="ciclo_closed_by")
        message_count = (
            select(func.count(MensajeConversacion.id))
            .where(MensajeConversacion.ciclo_id == ConversacionCiclo.id)
            .correlate(ConversacionCiclo)
            .scalar_subquery()
        )
        image_count = (
            select(func.count(MensajeConversacion.id))
            .where(
                MensajeConversacion.ciclo_id == ConversacionCiclo.id,
                MensajeConversacion.tipo_contenido == "image",
            )
            .correlate(ConversacionCiclo)
            .scalar_subquery()
        )
        statement = (
            select(
                ConversacionCiclo,
                Incidente.id.label("incidente_id"),
                Incidente.codigo.label("incidente_codigo"),
                Incidente.titulo.label("incidente_titulo"),
                Incidente.estado.label("incidente_estado"),
                Incidente.severidad.label("incidente_severidad"),
                closed_by.id.label("cerrado_por_id"),
                closed_by.nombre.label("cerrado_por_nombre"),
                closed_by.apellido.label("cerrado_por_apellido"),
                closed_by.email.label("cerrado_por_email"),
                closed_by.avatar_url.label("cerrado_por_avatar_url"),
                message_count.label("mensajes_count"),
                image_count.label("imagenes_count"),
            )
            .outerjoin(Incidente, Incidente.id == ConversacionCiclo.incidente_id)
            .outerjoin(closed_by, closed_by.id == ConversacionCiclo.cerrado_por_id)
            .where(ConversacionCiclo.conversacion_id == UUID(conversacion_id))
            .order_by(func.coalesce(ConversacionCiclo.closed_at, ConversacionCiclo.started_at).desc())
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_ciclo_detail(self, ciclo_id: str) -> dict[str, Any] | None:
        cycle = await self.db.get(ConversacionCiclo, UUID(ciclo_id))
        if not cycle:
            return None
        rows = await self.list_ciclos_for_conversacion(str(cycle.conversacion_id))
        cycle_row = next((row for row in rows if str(row["ConversacionCiclo"].id) == ciclo_id), None)
        if not cycle_row:
            return None
        return {
            "cycle": cycle_row,
            "messages": await self.list_mensajes_ciclo(ciclo_id, limit=1000),
            "events": await self.list_eventos_ciclo(ciclo_id, limit=1000),
        }

    # ---------------------------------------------------------------------------
    # LLM Usage Audit
    # ---------------------------------------------------------------------------

    async def list_llm_usage(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        conversacion_id: str | None = None,
        providers: list[str] | None = None,
        desde: str | None = None,
        hasta: str | None = None,
    ) -> tuple[list[ChatbotLlmUsage], int]:
        filters = []
        if conversacion_id:
            filters.append(ChatbotLlmUsage.conversacion_id == UUID(conversacion_id))
        if providers:
            filters.append(ChatbotLlmUsage.provider.in_(providers))
        if desde:
            filters.append(ChatbotLlmUsage.created_at >= desde)
        if hasta:
            filters.append(ChatbotLlmUsage.created_at <= hasta)

        where_clause = and_(*filters) if filters else True

        count_stmt = select(func.count()).select_from(ChatbotLlmUsage).where(where_clause)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        offset = (page - 1) * page_size
        items_stmt = (
            select(ChatbotLlmUsage)
            .where(where_clause)
            .order_by(ChatbotLlmUsage.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(items_stmt)
        items = list(result.scalars().all())
        return items, total

    async def get_llm_usage_stats(
        self,
        *,
        desde: str | None = None,
        hasta: str | None = None,
    ) -> dict[str, Any]:
        filters = []
        if desde:
            filters.append(ChatbotLlmUsage.created_at >= desde)
        if hasta:
            filters.append(ChatbotLlmUsage.created_at <= hasta)

        where_clause = and_(*filters) if filters else True

        agg_stmt = select(
            func.count().label("total_calls"),
            func.sum(ChatbotLlmUsage.total_tokens).label("total_tokens"),
            func.sum(ChatbotLlmUsage.prompt_tokens).label("prompt_tokens"),
            func.sum(ChatbotLlmUsage.completion_tokens).label("completion_tokens"),
            func.avg(ChatbotLlmUsage.latency_ms).label("avg_latency_ms"),
            func.sum(
                func.cast(ChatbotLlmUsage.fallback_applied, Integer)
            ).label("fallback_count"),
            func.count(func.distinct(ChatbotLlmUsage.conversacion_id)).label("unique_conversations"),
        ).where(where_clause)

        agg_result = await self.db.execute(agg_stmt)
        agg = dict(agg_result.mappings().one())

        prov_stmt = (
            select(
                ChatbotLlmUsage.provider,
                func.count().label("total_calls"),
                func.sum(ChatbotLlmUsage.total_tokens).label("total_tokens"),
                func.sum(ChatbotLlmUsage.prompt_tokens).label("prompt_tokens"),
                func.sum(ChatbotLlmUsage.completion_tokens).label("completion_tokens"),
                func.avg(ChatbotLlmUsage.latency_ms).label("avg_latency_ms"),
                func.sum(
                    func.cast(ChatbotLlmUsage.fallback_applied, Integer)
                ).label("fallback_count"),
            )
            .where(where_clause)
            .group_by(ChatbotLlmUsage.provider)
            .order_by(func.count().desc())
        )
        prov_result = await self.db.execute(prov_stmt)
        by_provider = [dict(row) for row in prov_result.mappings()]

        day_stmt = (
            select(
                cast(ChatbotLlmUsage.created_at, Date).label("day"),
                func.sum(ChatbotLlmUsage.total_tokens).label("total_tokens"),
                func.count().label("calls"),
            )
            .where(where_clause)
            .group_by(cast(ChatbotLlmUsage.created_at, Date))
            .order_by(cast(ChatbotLlmUsage.created_at, Date))
        )
        day_result = await self.db.execute(day_stmt)
        tokens_per_day = [
            {"day": str(row.day), "total_tokens": int(row.total_tokens or 0), "calls": int(row.calls)}
            for row in day_result
        ]

        total_calls = int(agg["total_calls"] or 0)
        fallback_count = int(agg["fallback_count"] or 0)

        return {
            "total_calls": total_calls,
            "total_tokens": int(agg["total_tokens"] or 0),
            "prompt_tokens": int(agg["prompt_tokens"] or 0),
            "completion_tokens": int(agg["completion_tokens"] or 0),
            "avg_latency_ms": float(agg["avg_latency_ms"]) if agg["avg_latency_ms"] else None,
            "fallback_rate": (fallback_count / total_calls) if total_calls > 0 else 0.0,
            "unique_conversations": int(agg["unique_conversations"] or 0),
            "by_provider": by_provider,
            "tokens_per_day": tokens_per_day,
        }

    async def get_stats(self) -> dict[str, int]:
        """Conteo de conversaciones activas agrupadas por estado."""
        statement = select(
            Conversacion.estado,
            func.count().label("total"),
        ).group_by(Conversacion.estado)
        result = await self.db.execute(statement)
        counts: dict[str, int] = {row.estado: int(row.total) for row in result}
        activos = ("EN_BOT", "EN_COLA", "EN_ATENCION", "ABIERTA")
        return {
            "en_bot": counts.get("EN_BOT", 0),
            "en_cola": counts.get("EN_COLA", 0),
            "en_atencion": counts.get("EN_ATENCION", 0),
            "abierta": counts.get("ABIERTA", 0),
            "total_activos": sum(counts.get(e, 0) for e in activos),
        }
