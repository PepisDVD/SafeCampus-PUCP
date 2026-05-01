"""
SQLAlchemy models for the sc_lost_found schema.
"""

import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import EstadoCasoLfEnum, TipoCasoLfEnum


class CategoriaObjeto(Base):
    __tablename__ = "categoria_objeto"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)
    icono: Mapped[str | None] = mapped_column(String(50))
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CasoLostFound(Base):
    __tablename__ = "caso_lost_found"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    codigo: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    tipo: Mapped[str] = mapped_column(TipoCasoLfEnum, nullable=False)
    estado: Mapped[str] = mapped_column(EstadoCasoLfEnum, nullable=False, server_default="ABIERTO")
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    categoria_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_lost_found.categoria_objeto.id"))
    geom: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326))
    lugar_referencia: Mapped[str | None] = mapped_column(String(255))
    fecha_evento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    foto_url: Mapped[str | None] = mapped_column(Text)
    reportante_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False)
    cerrado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"))
    contacto_info: Mapped[str | None] = mapped_column(String(255))
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class HistorialCasoLf(Base):
    __tablename__ = "historial_caso_lf"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    caso_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_lost_found.caso_lost_found.id", ondelete="CASCADE"), nullable=False)
    estado_anterior: Mapped[str | None] = mapped_column(EstadoCasoLfEnum)
    estado_nuevo: Mapped[str] = mapped_column(EstadoCasoLfEnum, nullable=False)
    accion: Mapped[str] = mapped_column(String(100), nullable=False)
    comentario: Mapped[str | None] = mapped_column(Text)
    ejecutado_por_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
