from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.schemas.admin import CambiarEstadoInput, UsuarioProfileUpdateInput
from app.services import admin_service
from app.services.admin_service import AdminService


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


@pytest.mark.anyio
async def test_listar_auditoria_serializes_uuid_fields(monkeypatch):
    monkeypatch.setattr(admin_service, "AdminRepository", FakeAdminRepository)

    response = await AdminService(db=None).listar_auditoria(limit=100)  # type: ignore[arg-type]

    item = response.items[0]
    assert response.total == 1
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
