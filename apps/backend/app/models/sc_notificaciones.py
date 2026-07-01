"""
SQLAlchemy models for the sc_notificaciones schema.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import CanalNotificacionEnum, EstadoNotificacionEnum


class PlantillaNotificacion(Base):
    __tablename__ = "plantilla_notificacion"
    __table_args__ = {"schema": "sc_notificaciones"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tipo_evento: Mapped[str] = mapped_column(String(100), nullable=False)
    canal: Mapped[str] = mapped_column(CanalNotificacionEnum, nullable=False)
    asunto: Mapped[str | None] = mapped_column(String(255))
    cuerpo_template: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[list[Any] | None] = mapped_column(JSONB, server_default="[]")
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class Notificacion(Base):
    __tablename__ = "notificacion"
    __table_args__ = {"schema": "sc_notificaciones"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    incidente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_incidentes.incidente.id")
    )
    destinatario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    tipo_evento: Mapped[str] = mapped_column(String(100), nullable=False)
    canal: Mapped[str] = mapped_column(CanalNotificacionEnum, nullable=False)
    estado: Mapped[str] = mapped_column(
        EstadoNotificacionEnum, nullable=False, server_default="PENDIENTE"
    )
    asunto: Mapped[str | None] = mapped_column(String(255))
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    reintentos: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    max_reintentos: Mapped[int] = mapped_column(Integer, nullable=False, server_default="3")
    error_detalle: Mapped[str | None] = mapped_column(Text)
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_lectura: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class PreferenciaNotificacion(Base):
    __tablename__ = "preferencia_notificacion"
    __table_args__ = {"schema": "sc_notificaciones"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id", ondelete="CASCADE"), nullable=False
    )
    canal: Mapped[str] = mapped_column(CanalNotificacionEnum, nullable=False)
    habilitado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
