from datetime import UTC, datetime

from app.api import deps
from app.api.v1 import incidentes as incidentes_routes
from app.main import app
from app.schemas.incidente import (
    IncidenteCreateItem,
    IncidenteCreateResponse,
    IncidenteListItem,
    IncidenteListResponse,
)


def test_listar_incidentes_requires_bearer_token(client):
    response = client.get("/api/v1/incidentes?limit=2")
    assert response.status_code == 401


def test_listar_incidentes_returns_payload_from_service(client, monkeypatch):
    async def _override_get_session():
        yield None

    async def _mock_list_incidentes(self, **kwargs):
        return IncidenteListResponse(
            items=[
                IncidenteListItem(
                    id="e5ce13d7-1e7b-4d8f-9e63-bf032f95b14b",
                    codigo="INC-20260424-00001",
                    titulo="Robo de laptop",
                    descripcion="Reporte de prueba",
                    estado="RECIBIDO",
                    severidad="ALTO",
                    categoria="robo",
                    zona="Biblioteca Central",
                    canal_origen="WEB",
                    reportante_nombre="Usuario PUCP",
                    operador_nombre=None,
                    fecha_registro=datetime.now(tz=UTC),
                )
            ],
            total=1,
        )

    app.dependency_overrides[deps.get_session] = _override_get_session
    monkeypatch.setattr(incidentes_routes.IncidenteService, "list_incidentes", _mock_list_incidentes)

    response = client.get(
        "/api/v1/incidentes?limit=2",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["codigo"] == "INC-20260424-00001"


def test_registrar_incidente_returns_confirmation(client, monkeypatch):
    async def _override_get_session():
        yield None

    async def _mock_registrar_incidente(self, **kwargs):
        return IncidenteCreateResponse(
            message="Tu incidente fue registrado correctamente.",
            incident=IncidenteCreateItem(
                id="e5ce13d7-1e7b-4d8f-9e63-bf032f95b14b",
                codigo="INC-20260424-00001",
                estado="RECIBIDO",
                canal_origen="WEB",
                fecha_registro=datetime.now(tz=UTC),
            ),
            reporte_entrante_id="7f63d3eb-7ab9-4ef3-80e4-6f01b594f40e",
            es_correlacionado=False,
        )

    app.dependency_overrides[deps.get_session] = _override_get_session
    monkeypatch.setattr(
        incidentes_routes.IncidenteService,
        "registrar_incidente",
        _mock_registrar_incidente,
    )

    response = client.post(
        "/api/v1/incidentes",
        headers={"Authorization": "Bearer fake-token"},
        json={
            "descripcion": "Persona sospechosa cerca del estacionamiento",
            "canal_origen": "WEB",
            "ubicacion_texto": "Estacionamiento Principal",
            "correlation_id": "retry-001",
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["incident"]["codigo"].startswith("INC-20260424-")


def test_registrar_incidente_rejects_missing_location(client):
    response = client.post(
        "/api/v1/incidentes",
        headers={"Authorization": "Bearer fake-token"},
        json={
            "descripcion": "Persona sospechosa cerca del estacionamiento",
            "canal_origen": "WEB",
        },
    )
    assert response.status_code == 422
