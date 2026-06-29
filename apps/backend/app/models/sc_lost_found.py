"""
SQLAlchemy models for the sc_lost_found schema.
"""

import uuid
from datetime import datetime, time
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import (
    EstadoCasoLfEnum,
    EstadoCustodiaEnum,
    EstadoMatchLfEnum,
    MotivoCierreLfEnum,
    TipoCasoLfEnum,
)


class CategoriaObjeto(Base):
    __tablename__ = "categoria_objeto"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    codigo: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)
    icono: Mapped[str | None] = mapped_column(String(50))
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    es_perecible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    orden_visual: Mapped[int] = mapped_column(nullable=False, server_default="0")
    metadatos_schema: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class MotivoCierreLf(Base):
    __tablename__ = "motivo_cierre_lf"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    codigo: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)
    clase_cierre: Mapped[str] = mapped_column(String, nullable=False)
    requiere_observacion: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    requiere_validacion_entrega: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    orden_visual: Mapped[int] = mapped_column(nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class CasoLostFound(Base):
    __tablename__ = "caso_lost_found"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    codigo: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    tipo: Mapped[str] = mapped_column(TipoCasoLfEnum, nullable=False)
    estado: Mapped[str] = mapped_column(EstadoCasoLfEnum, nullable=False, server_default="ABIERTO")
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    categoria_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_lost_found.categoria_objeto.id")
    )
    subcategoria: Mapped[str | None] = mapped_column(String(100))
    geom: Mapped[object | None] = mapped_column(Geometry("POINT", srid=4326))
    lugar_referencia: Mapped[str | None] = mapped_column(String(255))
    fecha_evento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hora_aproximada: Mapped[time | None] = mapped_column(Time)
    foto_url: Mapped[str | None] = mapped_column(Text)
    foto_adicional_urls: Mapped[list[Any] | None] = mapped_column(JSONB, server_default="[]")
    color_principal: Mapped[str | None] = mapped_column(String(50))
    marca: Mapped[str | None] = mapped_column(String(100))
    etiquetas: Mapped[list[Any] | None] = mapped_column(JSONB, server_default="[]")
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    motivo_cierre: Mapped[str | None] = mapped_column(MotivoCierreLfEnum)
    motivo_cierre_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_lost_found.motivo_cierre_lf.id")
    )
    observaciones_cierre: Mapped[str | None] = mapped_column(Text)
    oculto: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    origen: Mapped[str] = mapped_column(String(40), nullable=False, server_default="COMUNIDAD")
    ts_busqueda: Mapped[str | None] = mapped_column(Text)
    conteo_comentarios: Mapped[int] = mapped_column(nullable=False, server_default="0")
    reportante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    cerrado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    contacto_info: Mapped[str | None] = mapped_column(String(255))
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class HistorialCasoLf(Base):
    __tablename__ = "historial_caso_lf"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    caso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.caso_lost_found.id", ondelete="CASCADE"),
        nullable=False,
    )
    estado_anterior: Mapped[str | None] = mapped_column(EstadoCasoLfEnum)
    estado_nuevo: Mapped[str] = mapped_column(EstadoCasoLfEnum, nullable=False)
    accion: Mapped[str] = mapped_column(String(100), nullable=False)
    comentario: Mapped[str | None] = mapped_column(Text)
    ejecutado_por_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class MatchSugerido(Base):
    __tablename__ = "match_sugerido"
    __table_args__ = (
        UniqueConstraint("caso_perdido_id", "caso_encontrado_id", name="uq_match_sugerido_par"),
        Index("idx_match_sugerido_estado_score", "estado", "score_total"),
        {"schema": "sc_lost_found"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    caso_perdido_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.caso_lost_found.id", ondelete="CASCADE"),
        nullable=False,
    )
    caso_encontrado_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.caso_lost_found.id", ondelete="CASCADE"),
        nullable=False,
    )
    score_total: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    score_detalle: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    estado: Mapped[str] = mapped_column(
        EstadoMatchLfEnum, nullable=False, server_default="SUGERIDO"
    )
    respondido_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    respuesta_comentario: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ComentarioCasoLf(Base):
    __tablename__ = "comentario_caso_lf"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    caso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.caso_lost_found.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_lost_found.comentario_caso_lf.id", ondelete="CASCADE")
    )
    autor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    imagenes: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default="[]")
    tag: Mapped[str | None] = mapped_column(String(40))
    fijado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    fijado_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fijado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    destacados_count: Mapped[int] = mapped_column(nullable=False, server_default="0")
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    ocultado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    motivo_ocultamiento: Mapped[str | None] = mapped_column(Text)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ReaccionComentarioLf(Base):
    """Reacción "Destacar" de la comunidad: una por usuario y comentario."""

    __tablename__ = "reaccion_comentario_lf"
    __table_args__ = (
        UniqueConstraint("comentario_id", "usuario_id", name="uq_reaccion_comentario_lf"),
        Index("ix_reaccion_comentario_lf_comentario", "comentario_id"),
        {"schema": "sc_lost_found"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    comentario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.comentario_caso_lf.id", ondelete="CASCADE"),
        nullable=False,
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AccesoModuloLf(Base):
    """Supervisores habilitados para el módulo operativo de Lost & Found."""

    __tablename__ = "acceso_modulo_lf"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    asignado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ParticipanteHiloLf(Base):
    __tablename__ = "participante_hilo_lf"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    caso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.caso_lost_found.id", ondelete="CASCADE"),
        nullable=False,
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id", ondelete="CASCADE"), nullable=False
    )
    suscrito: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    ultima_lectura_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class CustodiaObjeto(Base):
    __tablename__ = "custodia_objeto"
    __table_args__ = {"schema": "sc_lost_found"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    caso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.caso_lost_found.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    estado: Mapped[str] = mapped_column(EstadoCustodiaEnum, nullable=False, server_default="ACTIVA")
    ubicacion_custodia: Mapped[str] = mapped_column(String(255), nullable=False)
    observaciones: Mapped[str | None] = mapped_column(Text)
    es_perecible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    recibido_por_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False
    )
    fecha_recepcion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    fecha_vencimiento: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reclamante_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    entregado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    metodo_verificacion: Mapped[str | None] = mapped_column(String(100))
    fecha_devolucion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    destino_descarte: Mapped[str | None] = mapped_column(String(150))
    motivo_descarte: Mapped[str | None] = mapped_column(Text)
    fecha_descarte: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ConfiguracionLf(Base):
    __tablename__ = "configuracion_lf"
    __table_args__ = {"schema": "sc_lost_found"}

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default="{}")
    descripcion: Mapped[str | None] = mapped_column(Text)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sc_users.usuario.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class RecordatorioCustodiaLf(Base):
    """Ledger de idempotencia de recordatorios de vencimiento de custodia.

    Evita generar el mismo recordatorio más de una vez (UNIQUE por custodia,
    tipo y fecha de referencia). La entrega real se delega al sistema de
    notificaciones transversal.
    """

    __tablename__ = "recordatorio_custodia_lf"
    __table_args__ = (
        UniqueConstraint(
            "custodia_id", "tipo", "fecha_referencia", name="uq_recordatorio_custodia"
        ),
        {"schema": "sc_lost_found"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    custodia_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_lost_found.custodia_objeto.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    fecha_referencia: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    enviado_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, server_default="PENDIENTE")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
