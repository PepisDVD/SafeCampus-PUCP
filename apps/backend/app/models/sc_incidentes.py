"""
SQLAlchemy models for the sc_incidentes schema.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import EstadoIncidenteEnum, NivelSeveridadEnum, TipoCanalEnum


class Incidente(Base):
    __tablename__ = "incidente"
    __table_args__ = {"schema": "sc_incidentes"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    codigo: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    estado: Mapped[str] = mapped_column(
        EstadoIncidenteEnum, nullable=False, server_default="RECIBIDO"
    )
    severidad: Mapped[str | None] = mapped_column(NivelSeveridadEnum)
    categoria: Mapped[str | None] = mapped_column(String(100))
    subcategoria: Mapped[str | None] = mapped_column(String(100))
    canal_origen: Mapped[str] = mapped_column(TipoCanalEnum, nullable=False)
    geom: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326))
    lugar_referencia: Mapped[str | None] = mapped_column(String(255))
    live_location_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    live_location_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    live_location_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reportante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    operador_asignado_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    supervisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    fecha_primera_respuesta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_resolucion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    es_anonimo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    prioridad_manual: Mapped[int | None] = mapped_column(Integer)
    notas_internas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class HistorialIncidente(Base):
    __tablename__ = "historial_incidente"
    __table_args__ = {"schema": "sc_incidentes"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    incidente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="CASCADE"),
        nullable=False,
    )
    estado_anterior: Mapped[str | None] = mapped_column(EstadoIncidenteEnum)
    estado_nuevo: Mapped[str] = mapped_column(EstadoIncidenteEnum, nullable=False)
    accion: Mapped[str] = mapped_column(String(100), nullable=False)
    comentario: Mapped[str | None] = mapped_column(Text)
    ejecutado_por_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Evidencia(Base):
    __tablename__ = "evidencia"
    __table_args__ = {"schema": "sc_incidentes"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    incidente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo_archivo: Mapped[str] = mapped_column(String(50), nullable=False)
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    url_archivo: Mapped[str] = mapped_column(Text, nullable=False)
    tamano_bytes: Mapped[int | None] = mapped_column(BigInteger)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    descripcion: Mapped[str | None] = mapped_column(Text)
    cargado_por_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ExpedienteCierre(Base):
    __tablename__ = "expediente_cierre"
    __table_args__ = {"schema": "sc_incidentes"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    incidente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    resumen_cierre: Mapped[str] = mapped_column(Text, nullable=False)
    resultado: Mapped[str | None] = mapped_column(Text)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    generado_por_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    pdf_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ComentarioIncidente(Base):
    __tablename__ = "comentario_incidente"
    __table_args__ = {"schema": "sc_incidentes"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    incidente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="CASCADE"),
        nullable=False,
    )
    autor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    es_interno: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class UbicacionIncidente(Base):
    __tablename__ = "ubicacion_incidente"
    __table_args__ = {"schema": "sc_incidentes"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    incidente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="CASCADE"),
        nullable=False,
    )
    geom: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    fuente: Mapped[str | None] = mapped_column(String(50))
    precision_metros: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    altitud: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    descripcion: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AsignacionRecurso(Base):
    __tablename__ = "asignacion_recurso"
    __table_args__ = {"schema": "sc_incidentes"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    incidente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_incidentes.incidente.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo_recurso: Mapped[str] = mapped_column(String(50), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    asignado_por_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    fecha_asignacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    fecha_liberacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
