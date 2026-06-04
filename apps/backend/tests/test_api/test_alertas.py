"""
Tests for alertas and GIS API endpoints with dependency overrides.
"""

from datetime import UTC, datetime

from app.api.deps import get_current_user
from app.api.v1.alertas import get_service as get_alerta_service
from app.api.v1.gis import get_service as get_gis_service
from app.core.constants import (
    CanalNotificacion,
    EstadoAlertaCampus,
    NivelSeveridad,
    OrigenAlerta,
)
from app.main import app
from app.schemas.alerta import (
    AlertaDetail,
    AlertaListItem,
    AlertaListResponse,
    AlertaPublishResponse,
    AlertasStatsResponse,
    GisHeatmapPoint,
    GisHeatmapResponse,
    GisNearbyItem,
    GisNearbyResponse,
)
from app.schemas.auth import AuthUserResponse


def _fake_operator() -> AuthUserResponse:
    return AuthUserResponse(
        id="00000000-0000-0000-0000-000000000001",
        email="operador@pucp.edu.pe",
        nombre="Test",
        apellido="Operador",
        avatar_url=None,
        codigo_institucional=None,
        telefono=None,
        departamento=None,
        roles=["operador"],
    )


def _alerta_item() -> AlertaListItem:
    return AlertaListItem(
        id="11111111-1111-1111-1111-111111111111",
        codigo="ALR-20260604-0001",
        tipo="ALR-MAS-SEG",
        familia="A",
        titulo="Alerta de campus",
        contenido="Evitar zona de mantenimiento temporal.",
        severidad=NivelSeveridad.MEDIO,
        estado=EstadoAlertaCampus.BORRADOR,
        origen=OrigenAlerta.MANUAL,
        canales=[CanalNotificacion.INAPP],
        zona_id=None,
        zona_nombre=None,
        latitud=-12.06945,
        longitud=-77.08055,
        radio_metros=250,
        fecha_programada=None,
        fecha_inicio=None,
        fecha_fin=None,
        created_by_id="00000000-0000-0000-0000-000000000001",
        created_at=datetime(2026, 6, 4, 12, 0, tzinfo=UTC),
        updated_at=datetime(2026, 6, 4, 12, 0, tzinfo=UTC),
        entregas_total=0,
        entregas_enviadas=0,
        entregas_fallidas=0,
    )


class FakeAlertaService:
    async def listar(self, **kwargs):
        return AlertaListResponse(items=[_alerta_item()], total=1)

    async def crear(self, *, body, actor_id):
        return AlertaDetail(**_alerta_item().model_dump(), segmentos=[], entregas=[], eventos=[])

    async def publicar(self, *, alerta_id, actor_id):
        detail = AlertaDetail(**_alerta_item().model_dump(), segmentos=[], entregas=[], eventos=[])
        return AlertaPublishResponse(
            alerta=detail,
            destinatarios=1,
            entregas_creadas=1,
            entregas_enviadas=1,
            entregas_fallidas=0,
        )

    async def stats(self):
        return AlertasStatsResponse(
            total=1,
            por_estado={"BORRADOR": 1},
            por_canal={"INAPP": 1},
            por_severidad={"MEDIO": 1},
            entregas_total=1,
            entregas_enviadas=1,
            entregas_fallidas=0,
        )


class FakeGisService:
    async def proximidad(self, **kwargs):
        return GisNearbyResponse(
            items=[
                GisNearbyItem(
                    tipo="alerta",
                    id="11111111-1111-1111-1111-111111111111",
                    codigo="ALR-20260604-0001",
                    titulo="Alerta de campus",
                    estado="ACTIVA",
                    severidad="MEDIO",
                    latitud=-12.06945,
                    longitud=-77.08055,
                    distancia_metros=12.5,
                )
            ],
            total=1,
        )

    async def heatmap(self, **kwargs):
        return GisHeatmapResponse(
            points=[
                GisHeatmapPoint(
                    tipo="alerta",
                    latitud=-12.06945,
                    longitud=-77.08055,
                    peso=0.45,
                    total=1,
                )
            ],
            total=1,
        )


def test_listar_alertas(client):
    app.dependency_overrides[get_alerta_service] = lambda: FakeAlertaService()
    app.dependency_overrides[get_current_user] = _fake_operator
    try:
        response = client.get("/api/v1/alertas")
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] == 1
        assert payload["items"][0]["codigo"].startswith("ALR-")
    finally:
        app.dependency_overrides.pop(get_alerta_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_crear_alerta(client):
    app.dependency_overrides[get_alerta_service] = lambda: FakeAlertaService()
    app.dependency_overrides[get_current_user] = _fake_operator
    try:
        response = client.post(
            "/api/v1/alertas",
            json={
                "titulo": "Alerta de campus",
                "contenido": "Evitar zona de mantenimiento temporal.",
                "severidad": "MEDIO",
                "canales": ["INAPP"],
                "segmentos": [{"tipo": "ROL", "valor": "comunidad"}],
            },
        )
        assert response.status_code == 201
        assert response.json()["estado"] == "BORRADOR"
    finally:
        app.dependency_overrides.pop(get_alerta_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_publicar_alerta(client):
    app.dependency_overrides[get_alerta_service] = lambda: FakeAlertaService()
    app.dependency_overrides[get_current_user] = _fake_operator
    try:
        response = client.post("/api/v1/alertas/11111111-1111-1111-1111-111111111111/publicar")
        assert response.status_code == 200
        assert response.json()["entregas_enviadas"] == 1
    finally:
        app.dependency_overrides.pop(get_alerta_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_gis_proximidad(client):
    app.dependency_overrides[get_gis_service] = lambda: FakeGisService()
    app.dependency_overrides[get_current_user] = _fake_operator
    try:
        response = client.get("/api/v1/gis/proximidad?latitud=-12.06945&longitud=-77.08055")
        assert response.status_code == 200
        assert response.json()["items"][0]["tipo"] == "alerta"
    finally:
        app.dependency_overrides.pop(get_gis_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_gis_heatmap(client):
    app.dependency_overrides[get_gis_service] = lambda: FakeGisService()
    app.dependency_overrides[get_current_user] = _fake_operator
    try:
        response = client.get("/api/v1/gis/heatmap?tipo=alertas")
        assert response.status_code == 200
        assert response.json()["points"][0]["peso"] == 0.45
    finally:
        app.dependency_overrides.pop(get_gis_service, None)
        app.dependency_overrides.pop(get_current_user, None)
