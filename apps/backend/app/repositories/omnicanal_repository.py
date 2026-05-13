"""Repository for sc_omnicanal webhook ingestion."""

import json
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sc_incidentes import Incidente
from app.models.sc_omnicanal import (
    CanalReporte,
    Conversacion,
    EventoConversacion,
    MensajeConversacion,
    ReporteEntrante,
)
from app.models.sc_users import Usuario


class OmnicanalRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

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
        operador = Usuario
        statement = (
            select(
                Conversacion,
                operador.id.label("operador_id"),
                operador.nombre.label("operador_nombre"),
                operador.apellido.label("operador_apellido"),
                operador.email.label("operador_email"),
                operador.avatar_url.label("operador_avatar_url"),
                Incidente.id.label("incidente_id"),
                Incidente.codigo.label("incidente_codigo"),
                Incidente.titulo.label("incidente_titulo"),
                Incidente.estado.label("incidente_estado"),
                Incidente.severidad.label("incidente_severidad"),
            )
            .outerjoin(operador, operador.id == Conversacion.operador_asignado_id)
            .outerjoin(Incidente, Incidente.id == Conversacion.incidente_id)
            .order_by(Conversacion.ultimo_mensaje_at.desc())
            .limit(limit)
        )
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
        statement = (
            select(Conversacion)
            .where(Conversacion.id == UUID(conversacion_id))
            .limit(1)
        )
        conversacion = await self.db.scalar(statement)
        if not conversacion:
            return None
        return {"Conversacion": conversacion}

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
