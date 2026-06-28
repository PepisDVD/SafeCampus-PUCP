"""
SQLAlchemy models for the sc_omnicanal schema.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import EstadoReporteEnum, TipoCanalEnum


class CanalReporte(Base):
    __tablename__ = "canal_reporte"
    __table_args__ = {"schema": "sc_omnicanal"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)
    tipo: Mapped[str] = mapped_column(TipoCanalEnum, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    configuracion: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ReporteEntrante(Base):
    __tablename__ = "reporte_entrante"
    __table_args__ = {"schema": "sc_omnicanal"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    canal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.canal_reporte.id"),
        nullable=False,
    )
    incidente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id"),
    )
    contenido_raw: Mapped[str] = mapped_column(Text, nullable=False)
    metadatos_canal: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    estado: Mapped[str] = mapped_column(
        EstadoReporteEnum,
        nullable=False,
        server_default="RECIBIDO",
    )
    es_correlacionado: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )
    ip_origen: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)
    fecha_recepcion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Conversacion(Base):
    __tablename__ = "conversacion"
    __table_args__ = (
        UniqueConstraint("canal_id", "external_chat_id", name="uq_conversacion_canal_chat"),
        CheckConstraint(
            "estado <> 'CERRADA' OR (modo_atencion IS NULL AND prioridad IS NULL "
            "AND operador_asignado_id IS NULL AND tomado_por_id IS NULL "
            "AND tomado_at IS NULL AND incidente_id IS NULL)",
            name="ck_conversacion_cerrada_sin_ciclo",
        ),
        Index("idx_conversacion_estado", "estado"),
        Index("idx_conversacion_operador", "operador_asignado_id"),
        Index("idx_conversacion_incidente", "incidente_id"),
        Index("idx_conversacion_ultimo_mensaje", "ultimo_mensaje_at"),
        {"schema": "sc_omnicanal"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    canal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.canal_reporte.id"),
        nullable=False,
    )
    external_chat_id: Mapped[str] = mapped_column(Text, nullable=False)
    telefono_contacto: Mapped[str | None] = mapped_column(String(32))
    nombre_contacto: Mapped[str | None] = mapped_column(String(160))
    estado: Mapped[str] = mapped_column(String(32), nullable=False, server_default="EN_BOT")
    modo_atencion: Mapped[str | None] = mapped_column(String(16), server_default="BOT")
    prioridad: Mapped[str | None] = mapped_column(String(16), server_default="MEDIO")
    operador_asignado_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    tomado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    tomado_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    incidente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id"),
    )
    ultimo_mensaje_preview: Mapped[str | None] = mapped_column(Text)
    ultimo_mensaje_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    cerrado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    cerrado_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    motivo_cierre: Mapped[str | None] = mapped_column(Text)
    metadatos: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ConversacionOperadorAsignado(Base):
    __tablename__ = "conversacion_operador_asignado"
    __table_args__ = (
        UniqueConstraint("conversacion_id", "operador_id", name="uq_conversacion_operador_asignado"),
        Index("idx_conversacion_operador_asignado_conv", "conversacion_id"),
        Index("idx_conversacion_operador_asignado_operador", "operador_id"),
        {"schema": "sc_omnicanal"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    conversacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.conversacion.id", ondelete="CASCADE"),
        nullable=False,
    )
    operador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
        nullable=False,
    )
    asignado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ConversacionIncidenteHistorial(Base):
    __tablename__ = "conversacion_incidente_historial"
    __table_args__ = (
        Index("idx_conversacion_incidente_historial_conv", "conversacion_id", "asociado_at"),
        Index("idx_conversacion_incidente_historial_incidente", "incidente_id"),
        Index(
            "uq_conversacion_incidente_historial_activa",
            "conversacion_id",
            unique=True,
            postgresql_where=text("finalizado_at IS NULL"),
        ),
        {"schema": "sc_omnicanal"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    conversacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.conversacion.id", ondelete="CASCADE"),
        nullable=False,
    )
    incidente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="SET NULL"),
    )
    actor_usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    actor_tipo: Mapped[str] = mapped_column(String(16), nullable=False, server_default="SISTEMA")
    tipo_asociacion: Mapped[str] = mapped_column(String(32), nullable=False)
    asociado_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    finalizado_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    motivo_finalizacion: Mapped[str | None] = mapped_column(String(64))
    metadatos: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")


class MensajeConversacion(Base):
    __tablename__ = "mensaje_conversacion"
    __table_args__ = (
        UniqueConstraint(
            "conversacion_id",
            "external_message_id",
            name="uq_mensaje_conversacion_external",
        ),
        Index("idx_mensaje_conversacion_created", "conversacion_id", "created_at"),
        Index("idx_mensaje_conversacion_external", "external_message_id"),
        {"schema": "sc_omnicanal"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    conversacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.conversacion.id", ondelete="CASCADE"),
        nullable=False,
    )
    external_message_id: Mapped[str | None] = mapped_column(Text)
    direccion: Mapped[str] = mapped_column(String(16), nullable=False)
    autor_tipo: Mapped[str] = mapped_column(String(16), nullable=False)
    autor_usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    contenido: Mapped[str | None] = mapped_column(Text)
    tipo_contenido: Mapped[str] = mapped_column(String(32), nullable=False, server_default="text")
    estado_entrega: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default="received",
    )
    payload_raw: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class EventoConversacion(Base):
    __tablename__ = "evento_conversacion"
    __table_args__ = (
        Index("idx_evento_conversacion_created", "conversacion_id", "created_at"),
        Index("idx_evento_conversacion_tipo", "tipo_evento"),
        {"schema": "sc_omnicanal"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    conversacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.conversacion.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo_evento: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ChatbotEstadoConversacion(Base):
    __tablename__ = "chatbot_estado_conversacion"
    __table_args__ = (
        UniqueConstraint(
            "conversacion_id",
            name="uq_chatbot_estado_conversacion",
        ),
        Index("idx_chatbot_estado_bot_status", "bot_status"),
        Index("idx_chatbot_estado_requires_review", "requires_human_review"),
        {"schema": "sc_omnicanal"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    conversacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.conversacion.id", ondelete="CASCADE"),
        nullable=False,
    )
    bot_status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="BOT_NEW")
    last_intent: Mapped[str | None] = mapped_column(String(32))
    last_action: Mapped[str | None] = mapped_column(String(32))
    requires_human_review: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )
    handoff_reason: Mapped[str | None] = mapped_column(Text)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    memory_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    incident_draft: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    missing_fields: Mapped[list[str] | None] = mapped_column(JSONB, server_default="[]")
    classification_category: Mapped[str | None] = mapped_column(String(100))
    classification_severity: Mapped[str | None] = mapped_column(String(16))
    classification_confidence: Mapped[float | None] = mapped_column(postgresql.DOUBLE_PRECISION)
    suggested_reply: Mapped[str | None] = mapped_column(Text)
    last_bot_reply: Mapped[str | None] = mapped_column(Text)
    last_user_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_bot_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ChatbotLlmUsage(Base):
    __tablename__ = "chatbot_llm_usage"
    __table_args__ = (
        Index("idx_chatbot_llm_usage_conversation", "conversacion_id", "created_at"),
        Index("idx_chatbot_llm_usage_correlation", "correlation_id"),
        Index("idx_chatbot_llm_usage_provider", "provider", "created_at"),
        {"schema": "sc_omnicanal"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    conversacion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_omnicanal.conversacion.id", ondelete="CASCADE"),
        nullable=False,
    )
    incidente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="SET NULL"),
    )
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    prompt_version: Mapped[str | None] = mapped_column(String(120))
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    fallback_applied: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    fallback_reason: Mapped[str | None] = mapped_column(String(32))
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
