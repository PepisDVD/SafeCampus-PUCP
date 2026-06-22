"""
SQLAlchemy models for the sc_auditoria schema.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RegistroAuditoria(Base):
    __tablename__ = "registro_auditoria"
    __table_args__ = {"schema": "sc_auditoria"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sc_users.usuario.id"),
    )
    modulo: Mapped[str] = mapped_column(String(50), nullable=False)
    accion: Mapped[str] = mapped_column(String(100), nullable=False)
    entidad: Mapped[str | None] = mapped_column(String(50))
    entidad_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    detalle: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    ip_origen: Mapped[str | None] = mapped_column(INET)
    dispositivo: Mapped[str | None] = mapped_column(String(255))
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
