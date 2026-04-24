from app.api import deps
from app.api.v1 import auth as auth_routes
from app.main import app
from app.schemas.auth import UserSyncResponse


def test_sync_user_requires_bearer_token(client):
    response = client.post("/api/v1/auth/sync-user")
    assert response.status_code == 401


def test_sync_user_returns_payload_from_service(client, monkeypatch):
    async def _override_get_session():
        yield None

    async def _mock_sync_user(self, *, access_token, ip_origen, user_agent):
        return UserSyncResponse(
            user_id="9adf099f-c8ea-4252-b6aa-0dc0ba77f8fc",
            email="usuario@pucp.edu.pe",
            roles=["comunidad"],
            is_new_user=False,
        )

    app.dependency_overrides[deps.get_session] = _override_get_session
    monkeypatch.setattr(auth_routes.UserSyncService, "sync_user", _mock_sync_user)

    response = client.post(
        "/api/v1/auth/sync-user",
        headers={"Authorization": "Bearer fake-token"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == "usuario@pucp.edu.pe"
    assert payload["roles"] == ["comunidad"]
    assert payload["is_new_user"] is False
