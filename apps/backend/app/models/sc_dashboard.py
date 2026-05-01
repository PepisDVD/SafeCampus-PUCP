"""
SQLAlchemy models for the sc_dashboard schema.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.db_enums import EstadoServicioEnum, TipoKpiEnum


class EstadoIntegracion(Base):
    __tablename__ = "estado_integracion"
    __table_args__ = {"schema": "sc_dashboard"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    servicio: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(EstadoServicioEnum, nullable=False)
    ultimo_check: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tiempo_respuesta_ms: Mapped[int | None] = mapped_column(Integer)
    detalle: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class KpiOperativo(Base):
    __tablename__ = "kpi_operativo"
    __table_args__ = {"schema": "sc_dashboard"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tipo: Mapped[str] = mapped_column(TipoKpiEnum, nullable=False)
    periodo: Mapped[str] = mapped_column(String(20), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    unidad: Mapped[str | None] = mapped_column(String(30))
    desglose: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ReporteExportado(Base):
    __tablename__ = "reporte_exportado"
    __table_args__ = {"schema": "sc_dashboard"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    formato: Mapped[str] = mapped_column(String(20), nullable=False)
    filtros: Mapped[dict[str, Any] | None] = mapped_column(JSONB, server_default="{}")
    ruta_archivo: Mapped[str] = mapped_column(Text, nullable=False)
    tamano_bytes: Mapped[int | None] = mapped_column(BigInteger)
    generado_por_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sc_users.usuario.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
