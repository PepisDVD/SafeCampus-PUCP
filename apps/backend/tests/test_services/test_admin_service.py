from datetime import datetime, timezone
from uuid import uuid4

import pytest

from fastapi import HTTPException

from app.repositories.admin_repository import _parse_fecha
from app.schemas.admin import (
    CambiarEstadoInput,
    UsuarioCreateInput,
    UsuarioProfileUpdateInput,
)
from app.services import admin_service
from app.services.admin_service import AdminService


def test_parse_fecha_solo_fecha_es_tz_aware_utc():
    desde = _parse_fecha("2026-05-23")
    assert desde.tzinfo is not None
    assert desde.isoformat() == "2026-05-23T00:00:00+00:00"


def test_parse_fecha_hasta_extiende_fin_de_dia():
    hasta = _parse_fecha("2026-05-23", end_of_day=True)
    assert hasta.year == 2026 and hasta.month == 5 and hasta.day == 23
    assert hasta.hour == 23 and hasta.minute == 59 and hasta.tzinfo is not None


def test_parse_fecha_iso_completo_se_respeta():
    valor = _parse_fecha("2026-05-23T08:30:00+00:00")
    assert valor.hour == 8 and valor.minute == 30


class FakeAdminRepository:
    profile_updates: list[tuple[str, dict]] = []
    status_updates: list[tuple[str, str]] = []
    usuario_id_override: str | None = None

    def __init__(self, _db):
        pass

    async def list_auditoria(self, **_filters):
        return [
            {
                "id": uuid4(),
                "usuario_id": uuid4(),
                "modulo": "admin",
                "accion": "actualizar",
                "entidad": "usuario",
                "entidad_id": uuid4(),
                "detalle": {"campo": "estado"},
                "fecha_registro": datetime(2026, 5, 1, tzinfo=timezone.utc),
                "usuario_nombre": "Ana",
                "usuario_apellido": "Torres",
                "usuario_email": "ana.torres@pucp.edu.pe",
                "usuario_avatar_url": None,
            }
        ]

    async def list_usuarios(self, **_filters):
        return [
            {
                "id": self.usuario_id_override or uuid4(),
                "nombre": "Luis",
                "apellido": "Ramos",
                "email": "luis.ramos@pucp.edu.pe",
                "codigo_institucional": "20260001",
                "telefono": "+51 999 111 222",
                "departamento": "Seguridad",
                "estado": "ACTIVO",
                "avatar_url": None,
                "ultimo_acceso": None,
                "created_at": datetime(2026, 5, 1, tzinfo=timezone.utc),
                "roles": [{"id": uuid4(), "nombre": "operador"}],
            }
        ]

    async def count_usuarios_por_estado(self):
        return {"total": 1, "activos": 1, "inactivos": 0, "suspendidos": 0}

    async def update_usuario_profile(self, usuario_id, data):
        self.profile_updates.append((usuario_id, data))
        return True

    async def count_admins_activos(self):
        return 2

    async def cambiar_estado(self, usuario_id, estado):
        self.status_updates.append((usuario_id, estado))


class FakeAuditoriaRepository:
    created: list[dict] = []

    def __init__(self, _db):
        pass

    async def create_registro(self, **data):
        FakeAuditoriaRepository.created.append(data)


@pytest.mark.anyio
async def test_listar_auditoria_serializes_uuid_fields(monkeypatch):
    monkeypatch.setattr(admin_service, "AdminRepository", FakeAdminRepository)

    response = await AdminService(db=None).listar_auditoria(page_size=25)  # type: ignore[arg-type]

    item = response.items[0]
    assert response.has_more is False
    assert response.next_cursor is None
    assert len(response.items) == 1
    assert isinstance(item.id, str)
    assert isinstance(item.usuario_id, str)
    assert isinstance(item.entidad_id, str)
    assert item.usuario is not None
    assert item.usuario.nombre_completo == "Ana Torres"
    assert item.usuario.email == "ana.torres@pucp.edu.pe"


@pytest.mark.anyio
async def test_listar_usuarios_incluye_telefono_para_perfil(monkeypatch):
    monkeypatch.setattr(admin_service, "AdminRepository", FakeAdminRepository)

    response = await AdminService(db=None).listar_usuarios()  # type: ignore[arg-type]

    assert response.items[0].telefono == "+51 999 111 222"


@pytest.mark.anyio
async def test_actualizar_perfil_usuario_no_reemplaza_roles(monkeypatch):
    FakeAdminRepository.profile_updates = []
    monkeypatch.setattr(admin_service, "AdminRepository", FakeAdminRepository)
    usuario_id = str(uuid4())
    FakeAdminRepository.usuario_id_override = usuario_id

    await AdminService(db=None).actualizar_perfil_usuario(  # type: ignore[arg-type]
        usuario_id,
        UsuarioProfileUpdateInput(
            nombre="Luis",
            apellido="Ramos",
            telefono="+51 900 000 000",
            departamento="Seguridad",
        ),
    )

    assert FakeAdminRepository.profile_updates == [
        (
            usuario_id,
            {
                "nombre": "Luis",
                "apellido": "Ramos",
                "telefono": "+51 900 000 000",
                "departamento": "Seguridad",
            },
        )
    ]
    FakeAdminRepository.usuario_id_override = None


@pytest.mark.anyio
async def test_usuario_suspendido_puede_reactivarse(monkeypatch):
    FakeAdminRepository.status_updates = []
    monkeypatch.setattr(admin_service, "AdminRepository", FakeAdminRepository)
    service = AdminService(db=None)  # type: ignore[arg-type]
    usuario_id = str(uuid4())

    await service.cambiar_estado(usuario_id, CambiarEstadoInput(estado="SUSPENDIDO"))
    await service.cambiar_estado(usuario_id, CambiarEstadoInput(estado="ACTIVO"))

    assert FakeAdminRepository.status_updates == [
        (usuario_id, "SUSPENDIDO"),
        (usuario_id, "ACTIVO"),
    ]


@pytest.mark.anyio
async def test_cambiar_estado_registra_auditoria_con_actor(monkeypatch):
    FakeAuditoriaRepository.created = []
    monkeypatch.setattr(admin_service, "AdminRepository", FakeAdminRepository)
    monkeypatch.setattr(admin_service, "AuditoriaRepository", FakeAuditoriaRepository)
    service = AdminService(db=None)  # type: ignore[arg-type]
    usuario_id = str(uuid4())
    actor_id = str(uuid4())

    await service.cambiar_estado(
        usuario_id,
        CambiarEstadoInput(estado="SUSPENDIDO"),
        actor_id=actor_id,
    )

    assert len(FakeAuditoriaRepository.created) == 1
    audit = FakeAuditoriaRepository.created[0]
    assert audit["modulo"] == "usuarios"
    assert audit["accion"] == "suspender"
    assert audit["entidad"] == "usuario"
    assert str(audit["usuario_id"]) == actor_id
    assert audit["detalle"]["origen"] == "WEB"
    assert audit["detalle"]["resultado"] == "exitoso"
    assert audit["detalle"]["after"] == {"estado": "SUSPENDIDO"}


@pytest.mark.anyio
async def test_cambiar_estado_sin_actor_no_audita(monkeypatch):
    FakeAuditoriaRepository.created = []
    monkeypatch.setattr(admin_service, "AdminRepository", FakeAdminRepository)
    monkeypatch.setattr(admin_service, "AuditoriaRepository", FakeAuditoriaRepository)
    service = AdminService(db=None)  # type: ignore[arg-type]

    await service.cambiar_estado(str(uuid4()), CambiarEstadoInput(estado="ACTIVO"))

    assert FakeAuditoriaRepository.created == []


# ---------------------------------------------------------------------------
# Provisión de contraseñas (admin) — solo cuentas NO institucionales
# ---------------------------------------------------------------------------

class FakeCrearUsuarioRepository:
    last_create_data: dict | None = None

    def __init__(self, _db):
        self._id = str(uuid4())

    async def get_usuario_by_email(self, _email):
        return None

    async def create_usuario(self, data):
        FakeCrearUsuarioRepository.last_create_data = data
        return self._id

    async def assign_rol(self, _usuario_id, _rol_id):
        return None

    async def list_usuarios(self, **_filters):
        return [
            {
                "id": self._id,
                "nombre": "Nueva",
                "apellido": "Cuenta",
                "email": "nueva@gmail.com",
                "codigo_institucional": None,
                "telefono": None,
                "departamento": None,
                "estado": "ACTIVO",
                "avatar_url": None,
                "ultimo_acceso": None,
                "created_at": datetime(2026, 6, 1, tzinfo=timezone.utc),
                "roles": [{"id": uuid4(), "nombre": "comunidad"}],
            }
        ]


def _crear_input(email: str, **extra) -> UsuarioCreateInput:
    return UsuarioCreateInput(
        nombre="Nueva",
        apellido="Cuenta",
        email=email,
        rol_id=str(uuid4()),
        **extra,
    )


@pytest.mark.anyio
async def test_crear_usuario_institucional_rechaza_password(monkeypatch):
    monkeypatch.setattr(admin_service, "AdminRepository", FakeCrearUsuarioRepository)
    service = AdminService(db=None)  # type: ignore[arg-type]

    with pytest.raises(HTTPException) as exc:
        await service.crear_usuario(
            _crear_input("docente@pucp.edu.pe", generar_password=True)
        )

    assert exc.value.status_code == 400
    assert "SSO" in exc.value.detail


@pytest.mark.anyio
async def test_crear_usuario_no_institucional_password_autogenerada(monkeypatch):
    FakeCrearUsuarioRepository.last_create_data = None
    monkeypatch.setattr(admin_service, "AdminRepository", FakeCrearUsuarioRepository)
    service = AdminService(db=None)  # type: ignore[arg-type]

    result = await service.crear_usuario(
        _crear_input("nueva@gmail.com", generar_password=True)
    )

    assert result.password_generada
    stored = FakeCrearUsuarioRepository.last_create_data
    assert stored is not None and str(stored["password_hash"]).startswith("$2b$")


@pytest.mark.anyio
async def test_crear_usuario_no_institucional_password_manual(monkeypatch):
    FakeCrearUsuarioRepository.last_create_data = None
    monkeypatch.setattr(admin_service, "AdminRepository", FakeCrearUsuarioRepository)
    service = AdminService(db=None)  # type: ignore[arg-type]

    result = await service.crear_usuario(
        _crear_input("nueva@gmail.com", password="ClaveSegura2026!")
    )

    # Las contraseñas manuales no se devuelven al admin (ya las conoce).
    assert result.password_generada is None
    stored = FakeCrearUsuarioRepository.last_create_data
    assert stored is not None and str(stored["password_hash"]).startswith("$2b$")


@pytest.mark.anyio
async def test_crear_usuario_sin_credenciales_no_pone_password(monkeypatch):
    FakeCrearUsuarioRepository.last_create_data = None
    monkeypatch.setattr(admin_service, "AdminRepository", FakeCrearUsuarioRepository)
    service = AdminService(db=None)  # type: ignore[arg-type]

    await service.crear_usuario(_crear_input("nueva@gmail.com"))

    stored = FakeCrearUsuarioRepository.last_create_data
    assert stored is not None and stored["password_hash"] is None
