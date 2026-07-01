"""
Tests del endpoint de incidentes — usan dependency override para no requerir BD real.
"""

from datetime import UTC, datetime

from app.api.deps import get_current_user
from app.api.v1.incidentes import get_service
from app.core.constants import EstadoIncidente, NivelSeveridad, TipoCanal
from app.main import app
from app.schemas.auth import AuthUserResponse
from app.schemas.incidente import (
    ExpedienteCierreAiDraft,
    IncidenteDetail,
    IncidenteListItem,
    IncidenteLiveLocationUpdate,
    IncidenteMapaItem,
    IncidenteMapaResponse,
)


class FakeIncidenteService:
    async def listar_recentes(
        self,
        *,
        search: str | None = None,
        severidad: str | None = None,
        estado: str | None = None,
        asignado_a: str | None = None,
        limit: int = 20,
    ) -> list[IncidenteListItem]:
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
                operador_avatar_url=None,
                created_at=datetime(2026, 4, 18, 9, 15, tzinfo=UTC),
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
                operador_avatar_url=None,
                created_at=datetime(2026, 4, 18, 9, 40, tzinfo=UTC),
            ),
        ]
        # Filtros para probar la firma — sin lógica real, solo respeta params.
        filtered = items
        if estado:
            filtered = [i for i in filtered if i.estado == estado]
        if severidad:
            filtered = [i for i in filtered if i.severidad == severidad]
        return filtered[:limit]

    async def listar_mapa(
        self,
        *,
        severidad: str | None = None,
        estado: str | None = None,
        activos_only: bool = True,
        limit: int = 300,
    ) -> IncidenteMapaResponse:
        items = [
            IncidenteMapaItem(
                id="e5ce13d7-1e7b-4d8f-9e63-bf032f95b14b",
                codigo="INC-20260418-0001",
                titulo="Robo de laptop en biblioteca central",
                estado=EstadoIncidente.EN_ATENCION,
                severidad=NivelSeveridad.ALTO,
                categoria="robo",
                lugar_referencia="Biblioteca Central",
                latitud=-12.06925,
                longitud=-77.0805,
                created_at=datetime(2026, 4, 18, 9, 15, tzinfo=UTC),
            ),
            IncidenteMapaItem(
                id="7f63d3eb-7ab9-4ef3-80e4-6f01b594f40e",
                codigo="INC-20260418-0002",
                titulo="Persona sospechosa en estacionamiento",
                estado=EstadoIncidente.RECIBIDO,
                severidad=NivelSeveridad.MEDIO,
                categoria="persona_sospechosa",
                lugar_referencia="Estacionamiento Principal",
                latitud=None,
                longitud=None,
                created_at=datetime(2026, 4, 18, 9, 40, tzinfo=UTC),
            ),
        ]
        return IncidenteMapaResponse(
            items=items[:limit],
            total=len(items[:limit]),
            georreferenciados=1,
            sin_coordenadas=1,
        )

    async def generar_borrador_cierre_ia(
        self,
        incidente_id: str,
        ejecutor_id: str,
    ) -> ExpedienteCierreAiDraft:
        assert incidente_id == "11111111-1111-1111-1111-111111111111"
        assert ejecutor_id == "00000000-0000-0000-0000-000000000001"
        return ExpedienteCierreAiDraft(
            resumen_cierre=(
                "El incidente fue atendido con el contexto disponible y queda listo para cierre."
            ),
            resultado_cierre="Cierre operativo sugerido.",
        )

    async def actualizar_ubicacion_en_vivo(
        self,
        incidente_id: str,
        reportante_id: str,
        data: IncidenteLiveLocationUpdate,
    ) -> IncidenteDetail:
        assert incidente_id == "11111111-1111-1111-1111-111111111111"
        assert reportante_id == "00000000-0000-0000-0000-000000000001"
        return IncidenteDetail(
            id=incidente_id,
            codigo="INC-20260418-0001",
            titulo="Robo de laptop en biblioteca central",
            descripcion=None,
            estado=EstadoIncidente.RECIBIDO,
            severidad=NivelSeveridad.ALTO,
            categoria="robo",
            lugar_referencia="Ubicacion GPS en vivo",
            latitud=data.latitud,
            longitud=data.longitud,
            live_location_enabled=data.activo,
            live_location_updated_at=datetime(2026, 4, 18, 9, 45, tzinfo=UTC)
            if data.activo
            else None,
            live_location_expires_at=datetime(2026, 4, 18, 9, 46, tzinfo=UTC)
            if data.activo
            else None,
            canal_origen=TipoCanal.WEB,
            created_at=datetime(2026, 4, 18, 9, 40, tzinfo=UTC),
            updated_at=datetime(2026, 4, 18, 9, 45, tzinfo=UTC),
            historial=[],
            comentarios=[],
            evidencias=[],
        )


def _fake_supervisor() -> AuthUserResponse:
    return AuthUserResponse(
        id="00000000-0000-0000-0000-000000000001",
        email="supervisor@pucp.edu.pe",
        nombre="Test",
        apellido="Supervisor",
        avatar_url=None,
        codigo_institucional=None,
        telefono=None,
        departamento=None,
        roles=["supervisor"],
    )


def test_listar_incidentes(client):
    app.dependency_overrides[get_service] = lambda: FakeIncidenteService()
    app.dependency_overrides[get_current_user] = _fake_supervisor
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
        app.dependency_overrides.pop(get_current_user, None)


def test_listar_incidentes_filtra_por_estado(client):
    app.dependency_overrides[get_service] = lambda: FakeIncidenteService()
    app.dependency_overrides[get_current_user] = _fake_supervisor
    try:
        response = client.get("/api/v1/incidentes?estado=EN_ATENCION")
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] == 1
        assert payload["items"][0]["estado"] == "EN_ATENCION"
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_listar_incidentes_mapa(client):
    app.dependency_overrides[get_service] = lambda: FakeIncidenteService()
    app.dependency_overrides[get_current_user] = _fake_supervisor
    try:
        response = client.get("/api/v1/incidentes/mapa")
        assert response.status_code == 200
        payload = response.json()
        assert payload["georreferenciados"] == 1
        assert payload["sin_coordenadas"] == 1
        assert payload["items"][0]["latitud"] == -12.06925
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_generar_borrador_cierre_ia(client):
    app.dependency_overrides[get_service] = lambda: FakeIncidenteService()
    app.dependency_overrides[get_current_user] = _fake_supervisor
    try:
        response = client.post(
            "/api/v1/incidentes/11111111-1111-1111-1111-111111111111/expediente-cierre/borrador-ia"
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["resumen_cierre"].startswith("El incidente fue atendido")
        assert payload["resultado_cierre"] == "Cierre operativo sugerido."
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_actualizar_ubicacion_en_vivo(client):
    app.dependency_overrides[get_service] = lambda: FakeIncidenteService()
    app.dependency_overrides[get_current_user] = _fake_supervisor
    try:
        response = client.patch(
            "/api/v1/incidentes/11111111-1111-1111-1111-111111111111/ubicacion-live",
            json={
                "latitud": -12.06925,
                "longitud": -77.0805,
                "precision_metros": 8.5,
                "activo": True,
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["latitud"] == -12.06925
        assert payload["live_location_enabled"] is True
        assert payload["live_location_updated_at"] is not None
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)
