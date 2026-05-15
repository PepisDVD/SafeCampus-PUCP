"""
SQLAlchemy models for the sc_omnicanal schema.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
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
    modo_atencion: Mapped[str] = mapped_column(String(16), nullable=False, server_default="BOT")
    prioridad: Mapped[str] = mapped_column(String(16), nullable=False, server_default="MEDIO")
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
