"""
Logica de negocio para notificaciones internas.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.notificacion_repository import NotificacionRepository
from app.schemas.notificacion import (
    NotificacionItem,
    NotificacionListResponse,
    NotificacionUnreadCount,
)


class NotificacionService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = NotificacionRepository(db)

    async def listar(
        self,
        usuario_id: str,
        *,
        unread_only: bool = False,
        limit: int = 30,
    ) -> NotificacionListResponse:
        safe_limit = max(1, min(limit, 100))
        rows = await self._repo.list_by_destinatario(
            usuario_id,
            unread_only=unread_only,
            limit=safe_limit,
        )
        unread_count = await self._repo.count_unread(usuario_id)
        return NotificacionListResponse(
            items=[self._map_item(row) for row in rows],
            total=len(rows),
            unread_count=unread_count,
        )

    async def contar_no_leidas(self, usuario_id: str) -> NotificacionUnreadCount:
        return NotificacionUnreadCount(
            unread_count=await self._repo.count_unread(usuario_id)
        )

    async def marcar_leida(self, usuario_id: str, notificacion_id: str) -> None:
        try:
            UUID(notificacion_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de notificacion invalido.",
            ) from exc

        marked = await self._repo.mark_read(usuario_id, notificacion_id)
        if not marked:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificacion no encontrada.",
            )

    async def marcar_todas_leidas(self, usuario_id: str) -> NotificacionUnreadCount:
        await self._repo.mark_all_read(usuario_id)
        return await self.contar_no_leidas(usuario_id)

    @staticmethod
    def _map_item(row: dict) -> NotificacionItem:
        return NotificacionItem(
            id=str(row["id"]),
            incidente_id=str(row["incidente_id"]) if row.get("incidente_id") else None,
            tipo_evento=row["tipo_evento"],
            canal=row["canal"],
            estado=row["estado"],
            asunto=row.get("asunto"),
            contenido=row["contenido"],
            fecha_envio=row.get("fecha_envio"),
            fecha_lectura=row.get("fecha_lectura"),
            created_at=row["created_at"],
        )
