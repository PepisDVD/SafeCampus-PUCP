"""Repository for sc_omnicanal webhook ingestion."""

from datetime import UTC, datetime
import json
from typing import Any
from uuid import UUID

from sqlalchemy import Integer, and_, cast, Date, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.sc_incidentes import Incidente
from app.models.sc_omnicanal import (
    CanalReporte,
    ChatbotEstadoConversacion,
    ChatbotLlmUsage,
    Conversacion,
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
            )
            .outerjoin(operador, operador.id == Conversacion.operador_asignado_id)
            .outerjoin(tomado_por, tomado_por.id == Conversacion.tomado_por_id)
            .outerjoin(Incidente, Incidente.id == Conversacion.incidente_id)
            .outerjoin(
                ChatbotEstadoConversacion,
                ChatbotEstadoConversacion.conversacion_id == Conversacion.id,
            )
        )

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
    ) -> MensajeConversacion | None:
        values = {
            "conversacion_id": conversacion_id,
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
    ) -> EventoConversacion:
        evento = EventoConversacion(
            conversacion_id=conversacion_id,
            tipo_evento=tipo_evento,
            actor_usuario_id=UUID(actor_usuario_id) if actor_usuario_id else None,
            payload=payload or {},
        )
        self.db.add(evento)
        await self.db.flush()
        await self.db.refresh(evento)
        return evento

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
    ) -> ChatbotLlmUsage:
        usage = ChatbotLlmUsage(
            conversacion_id=UUID(conversacion_id),
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
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(**values)
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def list_mensajes(self, conversacion_id: str, limit: int) -> list[dict[str, Any]]:
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
            .where(MensajeConversacion.conversacion_id == UUID(conversacion_id))
            .order_by(MensajeConversacion.created_at.asc())
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_eventos(self, conversacion_id: str, limit: int) -> list[dict[str, Any]]:
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
            .where(EventoConversacion.conversacion_id == UUID(conversacion_id))
            .order_by(EventoConversacion.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def assign_conversacion(
        self,
        conversacion_id: str,
        operador_id: str,
    ) -> Conversacion | None:
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(
                operador_asignado_id=UUID(operador_id),
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
        usuario_id: str,
        motivo: str | None,
    ) -> Conversacion | None:
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(
                estado="CERRADA",
                cerrado_por_id=UUID(usuario_id),
                cerrado_at=func.now(),
                motivo_cierre=motivo,
                updated_at=func.now(),
            )
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def reabrir_conversacion(self, conversacion_id: str) -> Conversacion | None:
        statement = (
            update(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .values(
                estado="EN_COLA",
                modo_atencion="HUMANO",
                cerrado_por_id=None,
                cerrado_at=None,
                motivo_cierre=None,
                updated_at=func.now(),
            )
            .returning(Conversacion)
        )
        result = await self.db.execute(statement)
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
        return conversacion

    # ---------------------------------------------------------------------------
    # LLM Usage Audit
    # ---------------------------------------------------------------------------

    async def list_llm_usage(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        conversacion_id: str | None = None,
        provider: str | None = None,
        desde: str | None = None,
        hasta: str | None = None,
    ) -> tuple[list[ChatbotLlmUsage], int]:
        filters = []
        if conversacion_id:
            filters.append(ChatbotLlmUsage.conversacion_id == UUID(conversacion_id))
        if provider:
            filters.append(ChatbotLlmUsage.provider == provider)
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
