from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.auth_policy import AuthChannel
from app.core.config import settings
from app.services import auth_service as auth_service_module
from app.services.auth_service import AuthService


class FakeAuthRepository:
    """Repositorio en memoria para aislar la lógica de sincronización."""

    def __init__(self, _db, existing_roles=None, registered=False):
        self.assigned: list[str] = []
        self._roles: list[str] = list(existing_roles or [])
        self._registered = registered

    async def upsert_oauth_user(self, data):
        return {
            "id": str(uuid4()),
            "email": data["email"],
            "nombre": data["nombre"],
            "apellido": data["apellido"],
            "avatar_url": None,
        }

    async def get_user_credentials_by_email(self, email):
        if not self._registered:
            return None
        return {"id": str(uuid4()), "email": email, "estado": "ACTIVO"}

    async def list_role_names(self, _usuario_id):
        return list(self._roles)

    async def assign_role(self, _usuario_id, rol_id):
        self.assigned.append(rol_id)
        # El único rol que la sincronización puede asignar es comunidad.
        self._roles.append("comunidad")


def _make_service(repo: FakeAuthRepository) -> AuthService:
    service = AuthService.__new__(AuthService)
    service._repo = repo
    return service


def _supabase_user(email: str) -> dict:
    return {
        "id": str(uuid4()),
        "email": email,
        "email_confirmed_at": "2026-06-01T00:00:00Z",
        "user_metadata": {"full_name": "Nuevo Usuario"},
    }


@pytest.mark.anyio
async def test_sso_institucional_nuevo_recibe_comunidad():
    repo = FakeAuthRepository(None, existing_roles=[])
    service = _make_service(repo)

    user = await service.sync_supabase_user_data(_supabase_user("nuevo@pucp.edu.pe"))

    assert user.roles == ["comunidad"]
    # Nunca se asigna administrador por defecto.
    assert repo.assigned == [settings.DEFAULT_COMMUNITY_ROLE_ID]


@pytest.mark.anyio
async def test_sso_no_reasigna_si_ya_tiene_rol():
    repo = FakeAuthRepository(None, existing_roles=["supervisor"])
    service = _make_service(repo)

    user = await service.sync_supabase_user_data(_supabase_user("jefe@pucp.edu.pe"))

    assert user.roles == ["supervisor"]
    assert repo.assigned == []


@pytest.mark.anyio
async def test_sso_rechaza_correo_no_institucional():
    # El SSO es exclusivo de @pucp.edu.pe: un Gmail se rechaza aunque exista.
    repo = FakeAuthRepository(None, existing_roles=[])
    service = _make_service(repo)

    with pytest.raises(HTTPException) as exc:
        await service.sync_supabase_user_data(_supabase_user("dev@gmail.com"))

    assert exc.value.status_code == 403
    assert "institucional" in str(exc.value.detail).lower()
    assert repo.assigned == []


@pytest.mark.anyio
async def test_google_externo_no_registrado_es_denegado():
    # Flujo Google no institucional: sin auto-registro, la cuenta debe existir.
    repo = FakeAuthRepository(None, registered=False)
    service = _make_service(repo)

    with pytest.raises(HTTPException) as exc:
        await service.sync_supabase_user_data(
            _supabase_user("externo@gmail.com"),
            institutional=False,
        )

    assert exc.value.status_code == 403
    assert "registrada" in str(exc.value.detail).lower()
    assert repo.assigned == []


@pytest.mark.anyio
async def test_google_externo_registrado_no_autoprovisiona():
    repo = FakeAuthRepository(None, existing_roles=["supervisor"], registered=True)
    service = _make_service(repo)

    user = await service.sync_supabase_user_data(
        _supabase_user("jefe@gmail.com"),
        institutional=False,
    )

    assert user.roles == ["supervisor"]
    assert repo.assigned == []  # nunca se asigna comunidad a cuentas externas


@pytest.mark.anyio
async def test_google_externo_rechaza_correo_institucional():
    repo = FakeAuthRepository(None, registered=True)
    service = _make_service(repo)

    with pytest.raises(HTTPException) as exc:
        await service.sync_supabase_user_data(
            _supabase_user("docente@pucp.edu.pe"),
            institutional=False,
        )

    assert exc.value.status_code == 403
    assert "sso" in str(exc.value.detail).lower()


@pytest.mark.anyio
async def test_credenciales_rechazan_correo_institucional():
    # El login por credenciales es exclusivo para cuentas NO institucionales.
    service = _make_service(FakeAuthRepository(None))

    with pytest.raises(HTTPException) as exc:
        await service.login_web_with_credentials(
            email="docente@pucp.edu.pe",
            password="cualquier",
        )

    assert exc.value.status_code == 400
    assert "SSO" in str(exc.value.detail)


def test_enforce_channel_access_deniega_operador_en_web():
    service = AuthService.__new__(AuthService)
    with pytest.raises(HTTPException) as exc:
        service._enforce_channel_access(
            user_id="u1",
            email="op@example.com",
            roles=["operador"],
            channel=AuthChannel.WEB,
        )
    assert exc.value.status_code == 403
    assert "operador" in exc.value.detail


def test_enforce_channel_access_combinacion_anomala_se_loguea(caplog):
    service = AuthService.__new__(AuthService)
    with caplog.at_level("WARNING", logger=auth_service_module.__name__):
        effective = service._enforce_channel_access(
            user_id="u1",
            email="mix@example.com",
            roles=["operador", "supervisor"],
            channel=AuthChannel.WEB,
        )
    assert effective == ["supervisor"]
    assert "anómala" in caplog.text.lower() or "anomala" in caplog.text.lower()
