from app.api.deps import get_current_user
from app.api.v1.admin import get_service
from app.main import app
from app.schemas.admin import UsuarioOut
from app.schemas.auth import AuthUserResponse

USER_ID = "11111111-1111-1111-1111-111111111111"
ROLE_ID = "22222222-2222-2222-2222-222222222222"


class FakeAdminService:
    def __init__(self) -> None:
        self.profile_data = None
        self.statuses: list[str] = []

    async def actualizar_perfil_usuario(self, usuario_id, data, actor_id=None):
        self.profile_data = (usuario_id, data)
        return UsuarioOut(
            id=usuario_id,
            nombre=data.nombre,
            apellido=data.apellido,
            email="operador@pucp.edu.pe",
            codigo_institucional="20260001",
            telefono=data.telefono,
            departamento=data.departamento,
            estado="ACTIVO",
            avatar_url=None,
            ultimo_acceso=None,
            created_at="2026-06-19T12:00:00Z",
            roles=[{"id": ROLE_ID, "nombre": "operador"}],
        )

    async def cambiar_estado(self, usuario_id, data, actor_id=None):
        assert usuario_id == USER_ID
        self.statuses.append(data.estado)
        return {"message": "Estado actualizado correctamente."}

    async def crear_usuario(self, data, actor_id=None):
        self.created = data
        return UsuarioOut(
            id=USER_ID,
            nombre=data.nombre,
            apellido=data.apellido,
            email=data.email,
            codigo_institucional=data.codigo_institucional,
            telefono=None,
            departamento=data.departamento,
            estado="ACTIVO",
            avatar_url=None,
            ultimo_acceso=None,
            created_at="2026-06-19T12:00:00Z",
            roles=[{"id": ROLE_ID, "nombre": "operador"}],
        )


def _fake_admin() -> AuthUserResponse:
    return AuthUserResponse(
        id="00000000-0000-0000-0000-000000000001",
        email="admin@pucp.edu.pe",
        nombre="Admin",
        apellido="SafeCampus",
        avatar_url=None,
        codigo_institucional=None,
        telefono=None,
        departamento=None,
        roles=["administrador"],
    )


def test_admin_actualiza_perfil_y_reactiva_usuario(client):
    fake = FakeAdminService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_admin
    try:
        profile_response = client.patch(
            f"/api/v1/admin/usuarios/{USER_ID}/perfil",
            json={
                "nombre": "Rosa",
                "apellido": "Quispe",
                "telefono": "+51 900 000 001",
                "departamento": "Seguridad",
            },
        )
        suspend_response = client.patch(
            f"/api/v1/admin/usuarios/{USER_ID}/estado",
            json={"estado": "SUSPENDIDO"},
        )
        reactivate_response = client.patch(
            f"/api/v1/admin/usuarios/{USER_ID}/estado",
            json={"estado": "ACTIVO"},
        )

        assert profile_response.status_code == 200
        assert profile_response.json()["nombre"] == "Rosa"
        assert suspend_response.status_code == 200
        assert reactivate_response.status_code == 200
        assert fake.statuses == ["SUSPENDIDO", "ACTIVO"]
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def _crear_payload(email: str) -> dict:
    return {
        "nombre": "Nuevo",
        "apellido": "Usuario",
        "email": email,
        "codigo_institucional": "20260002",
        "departamento": "Seguridad",
        "rol_id": ROLE_ID,
    }


def test_crear_usuario_acepta_dominios_validos(client):
    fake = FakeAdminService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_admin
    try:
        for email in ("nuevo@gmail.com", "nuevo@pucp.edu.pe"):
            response = client.post("/api/v1/admin/usuarios", json=_crear_payload(email))
            assert response.status_code == 201, response.text
            assert response.json()["email"] == email
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_crear_usuario_rechaza_dominio_no_permitido(client):
    fake = FakeAdminService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_admin
    try:
        response = client.post(
            "/api/v1/admin/usuarios", json=_crear_payload("intruso@hotmail.com")
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)
