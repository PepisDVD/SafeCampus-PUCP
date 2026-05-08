"""
Tests de endpoints de notificaciones con dependency override.
"""

from datetime import datetime, timezone

from app.api.deps import get_current_user
from app.api.v1.notificaciones import get_service
from app.core.constants import CanalNotificacion, EstadoNotificacion
from app.main import app
from app.schemas.auth import AuthUserResponse
from app.schemas.notificacion import (
    NotificacionItem,
    NotificacionListResponse,
    NotificacionUnreadCount,
)


class FakeNotificacionService:
    async def listar(
        self,
        usuario_id: str,
        *,
        unread_only: bool = False,
        limit: int = 30,
    ) -> NotificacionListResponse:
        items = [
            NotificacionItem(
                id="10000000-0000-0000-0000-000000000001",
                incidente_id="20000000-0000-0000-0000-000000000001",
                tipo_evento="INCIDENTE_ESTADO_CAMBIADO",
                canal=CanalNotificacion.INAPP,
                estado=EstadoNotificacion.PENDIENTE,
                asunto="Estado actualizado",
                contenido="Tu incidente cambio de estado.",
                fecha_envio=datetime(2026, 5, 8, 10, 0, tzinfo=timezone.utc),
                fecha_lectura=None,
                created_at=datetime(2026, 5, 8, 10, 0, tzinfo=timezone.utc),
            )
        ]
        return NotificacionListResponse(
            items=items[:limit],
            total=len(items),
            unread_count=1,
        )

    async def contar_no_leidas(self, usuario_id: str) -> NotificacionUnreadCount:
        return NotificacionUnreadCount(unread_count=1)

    async def marcar_leida(self, usuario_id: str, notificacion_id: str) -> None:
        return None

    async def marcar_todas_leidas(self, usuario_id: str) -> NotificacionUnreadCount:
        return NotificacionUnreadCount(unread_count=0)


def _fake_user() -> AuthUserResponse:
    return AuthUserResponse(
        id="00000000-0000-0000-0000-000000000001",
        email="usuario@pucp.edu.pe",
        nombre="Test",
        apellido="User",
        avatar_url=None,
        codigo_institucional=None,
        telefono=None,
        departamento=None,
        roles=["comunidad"],
    )


def test_listar_notificaciones(client):
    app.dependency_overrides[get_service] = lambda: FakeNotificacionService()
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        response = client.get("/api/v1/notificaciones?limit=10")
        assert response.status_code == 200
        payload = response.json()
        assert payload["unread_count"] == 1
        assert payload["items"][0]["canal"] == "INAPP"
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_marcar_todas_leidas(client):
    app.dependency_overrides[get_service] = lambda: FakeNotificacionService()
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        response = client.patch("/api/v1/notificaciones/leer-todas")
        assert response.status_code == 200
        assert response.json()["unread_count"] == 0
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)
