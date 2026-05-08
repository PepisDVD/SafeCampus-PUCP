"""
Schemas Pydantic del modulo de notificaciones internas.
"""

from datetime import datetime

from pydantic import BaseModel

from app.core.constants import CanalNotificacion, EstadoNotificacion


class NotificacionItem(BaseModel):
    id: str
    incidente_id: str | None = None
    tipo_evento: str
    canal: CanalNotificacion
    estado: EstadoNotificacion
    asunto: str | None = None
    contenido: str
    fecha_envio: datetime | None = None
    fecha_lectura: datetime | None = None
    created_at: datetime


class NotificacionListResponse(BaseModel):
    items: list[NotificacionItem]
    total: int
    unread_count: int


class NotificacionUnreadCount(BaseModel):
    unread_count: int
