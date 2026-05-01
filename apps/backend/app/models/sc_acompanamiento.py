"""
SQLAlchemy models for the sc_acompanamiento schema.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import (
    EstadoAcompanamientoEnum,
    EstadoAlertaEnum,
    TipoAlertaAsEnum,
    TipoEventoAsEnum,
)


class AcompanamientoSeguro(Base):
    __tablename__ = "acompanamiento_seguro"
    __table_args__ = {"schema": "sc_acompanamiento"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False)
    estado: Mapped[str] = mapped_column(EstadoAcompanamientoEnum, nullable=False, server_default="PENDIENTE")
    geom_origen: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    geom_destino: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    lugar_origen: Mapped[str | None] = mapped_column(String(255))
    lugar_destino: Mapped[str | None] = mapped_column(String(255))
    duracion_estimada_min: Mapped[int | None] = mapped_column(Integer)
    fecha_inicio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    contacto_emergencia_nombre: Mapped[str | None] = mapped_column(String(100))
    contacto_emergencia_tel: Mapped[str | None] = mapped_column(String(20))
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class UbicacionTrayecto(Base):
    __tablename__ = "ubicacion_trayecto"
    __table_args__ = {"schema": "sc_acompanamiento"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    acomp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_acompanamiento.acompanamiento_seguro.id", ondelete="CASCADE"), nullable=False)
    geom: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    precision_metros: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    velocidad: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    bearing: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class AlertaAcompanamiento(Base):
    __tablename__ = "alerta_acompanamiento"
    __table_args__ = {"schema": "sc_acompanamiento"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    acomp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_acompanamiento.acompanamiento_seguro.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(TipoAlertaAsEnum, nullable=False)
    estado: Mapped[str] = mapped_column(EstadoAlertaEnum, nullable=False, server_default="ACTIVA")
    geom: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326))
    mensaje: Mapped[str | None] = mapped_column(Text)
    atendida_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"))
    fecha_atencion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class EventoAcompanamiento(Base):
    __tablename__ = "evento_acompanamiento"
    __table_args__ = {"schema": "sc_acompanamiento"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    acomp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_acompanamiento.acompanamiento_seguro.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(TipoEventoAsEnum, nullable=False)
    detalle: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
