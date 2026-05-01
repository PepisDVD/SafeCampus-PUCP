"""
SQLAlchemy models for the sc_clasificacion schema.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import NivelSeveridadEnum, OrigenClasificacionEnum


class ReglaClasificacion(Base):
    __tablename__ = "regla_clasificacion"
    __table_args__ = {"schema": "sc_clasificacion"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)
    condicion: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    categoria_resultado: Mapped[str] = mapped_column(String(100), nullable=False)
    severidad_resultado: Mapped[str] = mapped_column(NivelSeveridadEnum, nullable=False)
    prioridad: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ClasificacionIa(Base):
    __tablename__ = "clasificacion_ia"
    __table_args__ = {"schema": "sc_clasificacion"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    incidente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_incidentes.incidente.id", ondelete="CASCADE"), nullable=False, unique=True)
    categoria_sugerida: Mapped[str | None] = mapped_column(String(100))
    severidad_sugerida: Mapped[str | None] = mapped_column(NivelSeveridadEnum)
    confianza: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    origen: Mapped[str] = mapped_column(OrigenClasificacionEnum, nullable=False)
    modelo_utilizado: Mapped[str | None] = mapped_column(String(100))
    prompt_version: Mapped[str | None] = mapped_column(String(50))
    tokens_consumidos: Mapped[int | None] = mapped_column(Integer)
    tiempo_respuesta_ms: Mapped[int | None] = mapped_column(Integer)
    respuesta_raw: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    regla_clasificacion_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_clasificacion.regla_clasificacion.id"))
    categoria_final: Mapped[str | None] = mapped_column(String(100))
    severidad_final: Mapped[str | None] = mapped_column(NivelSeveridadEnum)
    confirmado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"))
    fecha_confirmacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
