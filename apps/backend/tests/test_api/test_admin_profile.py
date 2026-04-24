from app.api import deps
from app.api.v1 import admin as admin_routes
from app.api.v1 import profile as profile_routes
from app.main import app
from app.schemas.admin import (
    AdminAuditLogItem,
    AdminAuditLogsListResponse,
    AdminIntegrationItem,
    AdminIntegrationsListResponse,
    AdminRoleItem,
    AdminRolesListResponse,
)
from app.schemas.profile import MyProfileResponse


def test_admin_roles_requires_bearer_token(client):
    response = client.get("/api/v1/admin/roles")
    assert response.status_code == 401


def test_admin_roles_returns_payload(client, monkeypatch):
    async def _override_get_session():
        yield None

    async def _mock_list_roles(self, *, access_token):
        return AdminRolesListResponse(
            items=[
                AdminRoleItem(
                    id="0a812614-7127-4e6a-95fc-0639693e312b",
                    nombre="administrador",
                    descripcion="Administrador del sistema",
                    es_sistema=True,
                    permissions_count=20,
                )
            ],
            total=1,
        )

    app.dependency_overrides[deps.get_session] = _override_get_session
    monkeypatch.setattr(admin_routes.AdminService, "list_roles", _mock_list_roles)

    response = client.get(
        "/api/v1/admin/roles",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["nombre"] == "administrador"


def test_profile_me_returns_payload(client, monkeypatch):
    async def _override_get_session():
        yield None

    async def _mock_get_me(self, *, access_token):
        return MyProfileResponse(
            id="384883c3-5625-4bf5-a616-316b58f08514",
            email="luis.pachas@pucp.edu.pe",
            nombre="Luis",
            apellido="Pachas",
            codigo_institucional="20190001",
            departamento="DITIC",
            telefono=None,
            avatar_url=None,
            estado="activo",
            email_verificado=True,
            ultimo_acceso=None,
            roles=["administrador"],
        )

    app.dependency_overrides[deps.get_session] = _override_get_session
    monkeypatch.setattr(profile_routes.ProfileService, "get_me", _mock_get_me)

    response = client.get(
        "/api/v1/profile/me",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "luis.pachas@pucp.edu.pe"
    assert payload["roles"] == ["administrador"]


def test_admin_integrations_returns_payload(client, monkeypatch):
    async def _override_get_session():
        yield None

    async def _mock_list_integrations(self, *, access_token):
        return AdminIntegrationsListResponse(
            items=[
                AdminIntegrationItem(
                    id="0a812614-7127-4e6a-95fc-0639693e312b",
                    servicio="openai_api",
                    nombre="OpenAI API",
                    descripcion="Clasificacion",
                    categoria="ia",
                    estado="operativo",
                    ultima_verificacion=None,
                    latencia_ms=120,
                    mensaje_estado="OK",
                    detalle={},
                )
            ],
            total=1,
        )

    app.dependency_overrides[deps.get_session] = _override_get_session
    monkeypatch.setattr(admin_routes.AdminService, "list_integrations", _mock_list_integrations)

    response = client.get(
        "/api/v1/admin/integrations",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["servicio"] == "openai_api"


def test_admin_audit_logs_returns_payload(client, monkeypatch):
    async def _override_get_session():
        yield None

    async def _mock_list_audit_logs(
        self,
        *,
        access_token,
        limit,
        search,
        event_type,
        modulo,
        desde,
        hasta,
    ):
        return AdminAuditLogsListResponse(
            items=[
                AdminAuditLogItem(
                    id="5a812614-7127-4e6a-95fc-0639693e3555",
                    tipo="integracion_verificada",
                    actor="Admin User",
                    accion="verificar_integracion",
                    detalle="Se verifico openai_api",
                    timestamp="2026-04-23T10:00:00Z",
                    modulo="integraciones",
                    entidad="estado_integracion",
                    entidad_id="0a812614-7127-4e6a-95fc-0639693e312b",
                    ip_origen=None,
                    dispositivo=None,
                )
            ],
            total=1,
            limit=limit,
        )

    app.dependency_overrides[deps.get_session] = _override_get_session
    monkeypatch.setattr(admin_routes.AdminService, "list_audit_logs", _mock_list_audit_logs)

    response = client.get(
        "/api/v1/admin/audit-logs?limit=50",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["tipo"] == "integracion_verificada"
