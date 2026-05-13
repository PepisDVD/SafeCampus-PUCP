"""
Repository for writing reusable audit records.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sc_auditoria import RegistroAuditoria


class AuditoriaRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_registro(
        self,
        *,
        usuario_id: str | None,
        modulo: str,
        accion: str,
        entidad: str | None = None,
        entidad_id: str | None = None,
        detalle: dict[str, Any] | None = None,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ) -> None:
        registro = RegistroAuditoria(
            usuario_id=UUID(usuario_id) if usuario_id else None,
            modulo=modulo,
            accion=accion,
            entidad=entidad,
            entidad_id=UUID(entidad_id) if entidad_id else None,
            detalle=detalle,
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )
        self.db.add(registro)
