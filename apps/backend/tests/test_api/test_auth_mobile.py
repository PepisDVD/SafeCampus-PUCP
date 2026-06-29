from app.api.v1.auth import get_service
from app.main import app
from app.schemas.auth import AuthUserResponse


class FakeAuthService:
    async def login_operator_with_password(
        self,
        *,
        email: str,
        password: str,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ):
        assert email == "operador.seguridad@example.com"
        assert password == "secret"
        assert ip_origen
        assert dispositivo
        return _operator(), "mobile-jwt"

    async def login_mobile_with_supabase_access_token(
        self,
        access_token: str,
        *,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
    ):
        assert access_token == "supabase-token"
        assert ip_origen
        assert dispositivo
        return _operator(email="jorge.salinas@pucp.edu.pe"), "institutional-jwt"


def _operator(email: str = "operador.seguridad@example.com") -> AuthUserResponse:
    return AuthUserResponse(
        id="00000000-0000-0000-0000-000000000023",
        email=email,
        nombre="Jorge",
        apellido="Salinas",
        avatar_url=None,
        codigo_institucional="OP-023",
        telefono=None,
        departamento="Seguridad Campus",
        roles=["operador"],
    )


def test_mobile_operator_login_returns_bearer_token(client):
    app.dependency_overrides[get_service] = lambda: FakeAuthService()
    try:
        response = client.post(
            "/api/v1/auth/mobile/operator/login",
            json={
                "email": "operador.seguridad@example.com",
                "password": "secret",
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["access_token"] == "mobile-jwt"
        assert payload["token_type"] == "bearer"
        assert payload["user"]["roles"] == ["operador"]
    finally:
        app.dependency_overrides.pop(get_service, None)


def test_mobile_institutional_session_exchange_returns_bearer_token(client):
    app.dependency_overrides[get_service] = lambda: FakeAuthService()
    try:
        response = client.post(
            "/api/v1/auth/mobile/supabase-session",
            json={"access_token": "supabase-token"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["access_token"] == "institutional-jwt"
        assert payload["user"]["email"] == "jorge.salinas@pucp.edu.pe"
    finally:
        app.dependency_overrides.pop(get_service, None)
