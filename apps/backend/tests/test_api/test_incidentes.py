"""
Tests del endpoint de incidentes — usan dependency override para no requerir BD real.
"""

from datetime import datetime, timezone

from app.api.v1.incidentes import get_service
from app.core.constants import EstadoIncidente, NivelSeveridad, TipoCanal
from app.main import app
from app.schemas.incidente import IncidenteListItem


class FakeIncidenteService:
    async def listar_recentes(self, limit: int = 20) -> list[IncidenteListItem]:
        items = [
            IncidenteListItem(
                id="e5ce13d7-1e7b-4d8f-9e63-bf032f95b14b",
                codigo="INC-20260418-0001",
                titulo="Robo de laptop en biblioteca central",
                descripcion="Estudiante reporta robo de laptop en piso 2.",
                estado=EstadoIncidente.EN_ATENCION,
                severidad=NivelSeveridad.ALTO,
                categoria="robo",
                lugar_referencia="Biblioteca Central",
                canal_origen=TipoCanal.WEB,
                operador_nombre="Jorge Salinas",
                created_at=datetime(2026, 4, 18, 9, 15, tzinfo=timezone.utc),
            ),
            IncidenteListItem(
                id="7f63d3eb-7ab9-4ef3-80e4-6f01b594f40e",
                codigo="INC-20260418-0002",
                titulo="Persona sospechosa en estacionamiento",
                descripcion="Persona no identificada rondando vehiculos.",
                estado=EstadoIncidente.RECIBIDO,
                severidad=NivelSeveridad.MEDIO,
                categoria="persona_sospechosa",
                lugar_referencia="Estacionamiento Principal",
                canal_origen=TipoCanal.MENSAJERIA,
                operador_nombre=None,
                created_at=datetime(2026, 4, 18, 9, 40, tzinfo=timezone.utc),
            ),
        ]
        return items[:limit]


def test_listar_incidentes(client):
    app.dependency_overrides[get_service] = lambda: FakeIncidenteService()
    try:
        response = client.get("/api/v1/incidentes?limit=2")
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] == 2
        assert len(payload["items"]) == 2
        assert payload["items"][0]["codigo"].startswith("INC-")
        assert payload["items"][0]["lugar_referencia"] == "Biblioteca Central"
    finally:
        app.dependency_overrides.pop(get_service, None)