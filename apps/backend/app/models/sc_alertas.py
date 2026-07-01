"""
SQLAlchemy models for the sc_alertas schema.
"""

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import (
    CanalNotificacionEnum,
    EstadoAlertaCampusEnum,
    EstadoNotificacionEnum,
    NivelSeveridadEnum,
    TipoSegmentoAlertaEnum,
)


class AlertaCampus(Base):
    __tablename__ = "alerta"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    codigo: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, server_default="ALR-MAS-SEG")
    familia: Mapped[str] = mapped_column(String(1), nullable=False, server_default="A")
    titulo: Mapped[str] = mapped_column(String(180), nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    mensaje: Mapped[str | None] = mapped_column(Text)
    severidad: Mapped[str] = mapped_column(NivelSeveridadEnum, nullable=False)
    estado: Mapped[str] = mapped_column(
        EstadoAlertaCampusEnum, nullable=False, server_default="BORRADOR"
    )
    origen: Mapped[str] = mapped_column(String(20), nullable=False, server_default="MANUAL")
    canales: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default='["INAPP"]')
    zona_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_maestros.ubicacion_maestra.id")
    )
    geom: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326))
    radio_metros: Mapped[int | None] = mapped_column(Integer)
    fecha_programada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_inicio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    incidente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_incidentes.incidente.id")
    )
    regla_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_alertas.regla_alerta.id")
    )
    plantilla_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_alertas.plantilla_alerta.id")
    )
    vigencia_inicio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    vigencia_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    programada_para: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    published_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    creada_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    aprobada_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    atendida_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class AlertaSegmento(Base):
    __tablename__ = "alerta_segmento"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    alerta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_alertas.alerta.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(TipoSegmentoAlertaEnum, nullable=False)
    valor: Mapped[str] = mapped_column(String(160), nullable=False)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    ubicacion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_maestros.ubicacion_maestra.id")
    )
    radio_metros: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AlertaEntrega(Base):
    __tablename__ = "alerta_entrega"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    alerta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_alertas.alerta.id", ondelete="CASCADE"), nullable=False
    )
    destinatario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    canal: Mapped[str] = mapped_column(CanalNotificacionEnum, nullable=False)
    estado: Mapped[str] = mapped_column(
        EstadoNotificacionEnum, nullable=False, server_default="PENDIENTE"
    )
    notificacion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_notificaciones.notificacion.id")
    )
    external_message_id: Mapped[str | None] = mapped_column(String(160))
    error_detalle: Mapped[str | None] = mapped_column(Text)
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class AlertaEvento(Base):
    __tablename__ = "alerta_evento"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    alerta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_alertas.alerta.id", ondelete="CASCADE"), nullable=False
    )
    tipo_evento: Mapped[str] = mapped_column(String(80), nullable=False)
    estado_anterior: Mapped[str | None] = mapped_column(String(40))
    estado_nuevo: Mapped[str | None] = mapped_column(String(40))
    accion: Mapped[str | None] = mapped_column(String(100))
    comentario: Mapped[str | None] = mapped_column(Text)
    actor_usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    detalle: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ZonaGeografica(Base):
    __tablename__ = "zona_geografica"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    codigo: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    tipo: Mapped[str | None] = mapped_column(String(40))
    geom: Mapped[object] = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)
    centroide: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326))
    nivel_riesgo: Mapped[str | None] = mapped_column(NivelSeveridadEnum)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class PuntoInteres(Base):
    __tablename__ = "punto_interes"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    zona_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_alertas.zona_geografica.id")
    )
    ubicacion_maestra_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_maestros.ubicacion_maestra.id")
    )
    codigo: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    tipo: Mapped[str | None] = mapped_column(String(40))
    geom: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ReglaAlerta(Base):
    __tablename__ = "regla_alerta"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    codigo: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    tipo_alerta: Mapped[str] = mapped_column(String(20), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    parametros: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    severidad_resultante: Mapped[str | None] = mapped_column(NivelSeveridadEnum)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class PlantillaAlerta(Base):
    __tablename__ = "plantilla_alerta"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tipo_evento: Mapped[str] = mapped_column(String(100), nullable=False)
    canal: Mapped[str] = mapped_column(CanalNotificacionEnum, nullable=False)
    idioma: Mapped[str] = mapped_column(String(5), nullable=False, server_default="es")
    asunto: Mapped[str | None] = mapped_column(String(255))
    cuerpo_template: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default="[]")
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class AlertaZona(Base):
    __tablename__ = "alerta_zona"
    __table_args__ = {"schema": "sc_alertas"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    alerta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_alertas.alerta.id", ondelete="CASCADE"), nullable=False
    )
    zona_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_alertas.zona_geografica.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
