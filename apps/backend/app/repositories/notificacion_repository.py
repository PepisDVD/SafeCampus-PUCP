"""
Repositorio de notificaciones internas.
"""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sc_notificaciones import Notificacion


class NotificacionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_destinatario(
        self,
        destinatario_id: str,
        *,
        unread_only: bool = False,
        limit: int = 30,
    ) -> list[dict[str, Any]]:
        statement = (
            select(
                Notificacion.id,
                Notificacion.incidente_id,
                Notificacion.tipo_evento,
                Notificacion.canal,
                Notificacion.estado,
                Notificacion.asunto,
                Notificacion.contenido,
                Notificacion.fecha_envio,
                Notificacion.fecha_lectura,
                Notificacion.created_at,
            )
            .where(
                Notificacion.destinatario_id == UUID(destinatario_id),
                Notificacion.canal == "INAPP",
            )
            .order_by(Notificacion.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            statement = statement.where(Notificacion.fecha_lectura.is_(None))

        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def count_unread(self, destinatario_id: str) -> int:
        statement = select(func.count(Notificacion.id)).where(
            Notificacion.destinatario_id == UUID(destinatario_id),
            Notificacion.canal == "INAPP",
            Notificacion.fecha_lectura.is_(None),
        )
        return int(await self.db.scalar(statement) or 0)

    async def mark_read(self, destinatario_id: str, notificacion_id: str) -> bool:
        statement = (
            update(Notificacion)
            .where(
                Notificacion.id == UUID(notificacion_id),
                Notificacion.destinatario_id == UUID(destinatario_id),
            )
            .values(
                estado="ENVIADA",
                fecha_lectura=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            .returning(Notificacion.id)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none() is not None

    async def mark_all_read(self, destinatario_id: str) -> int:
        statement = (
            update(Notificacion)
            .where(
                Notificacion.destinatario_id == UUID(destinatario_id),
                Notificacion.canal == "INAPP",
                Notificacion.fecha_lectura.is_(None),
            )
            .values(
                estado="ENVIADA",
                fecha_lectura=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        result = await self.db.execute(statement)
        return int(result.rowcount or 0)

    async def create_inapp(
        self,
        *,
        destinatario_id: str,
        tipo_evento: str,
        contenido: str,
        asunto: str | None = None,
        incidente_id: str | None = None,
    ) -> str:
        return await self.create(
            destinatario_id=destinatario_id,
            tipo_evento=tipo_evento,
            canal="INAPP",
            estado="PENDIENTE",
            contenido=contenido,
            asunto=asunto,
            incidente_id=incidente_id,
        )

    async def create(
        self,
        *,
        destinatario_id: str,
        tipo_evento: str,
        canal: str,
        estado: str,
        contenido: str,
        asunto: str | None = None,
        incidente_id: str | None = None,
        error_detalle: str | None = None,
    ) -> str:
        row = Notificacion(
            incidente_id=UUID(incidente_id) if incidente_id else None,
            destinatario_id=UUID(destinatario_id),
            tipo_evento=tipo_evento,
            canal=canal,
            estado=estado,
            asunto=asunto,
            contenido=contenido,
            error_detalle=error_detalle,
            fecha_envio=datetime.now(timezone.utc),
        )
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return str(row.id)
