from fastapi import HTTPException, status

from app.api.v1.auth import get_service
from app.core.config import settings
from app.main import app
from app.schemas.auth import AuthUserResponse


def _user(roles: list[str], email: str = "operador@example.com") -> AuthUserResponse:
    return AuthUserResponse(
        id="00000000-0000-0000-0000-000000000099",
        email=email,
        nombre="Cuenta",
        apellido="Operativa",
        avatar_url=None,
        codigo_institucional=None,
        telefono=None,
        departamento=None,
        roles=roles,
    )


class FakeAuthService:
    async def login_web_with_credentials(self, *, email: str, password: str):
        assert password == "secret"
        return _user(["comunidad"], email=email), "web-session-token"

    async def login_operator_with_password(self, *, email: str, password: str):
        return _user(["operador"], email=email), "mobile-jwt"


class DenyingAuthService:
    async def login_web_with_credentials(self, *, email: str, password: str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
        )


def test_web_credentials_login_sets_session_cookie(client):
    app.dependency_overrides[get_service] = lambda: FakeAuthService()
    try:
        response = client.post(
            "/api/v1/auth/web/credentials/login",
            json={"email": "ana@gmail.com", "password": "secret"},
        )
        assert response.status_code == 200
        assert response.json()["roles"] == ["comunidad"]
        assert settings.SESSION_COOKIE_NAME in response.cookies
    finally:
        app.dependency_overrides.pop(get_service, None)


def test_web_credentials_login_invalid_returns_401(client):
    app.dependency_overrides[get_service] = lambda: DenyingAuthService()
    try:
        response = client.post(
            "/api/v1/auth/web/credentials/login",
            json={"email": "ana@gmail.com", "password": "wrong"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Credenciales inválidas."
        assert settings.SESSION_COOKIE_NAME not in response.cookies
    finally:
        app.dependency_overrides.pop(get_service, None)


def test_mobile_credentials_login_returns_jwt(client):
    app.dependency_overrides[get_service] = lambda: FakeAuthService()
    try:
        response = client.post(
            "/api/v1/auth/mobile/operator/login",
            json={"email": "operador@example.com", "password": "secret"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["access_token"] == "mobile-jwt"
        assert payload["user"]["roles"] == ["operador"]
    finally:
        app.dependency_overrides.pop(get_service, None)
