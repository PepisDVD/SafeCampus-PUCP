from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.services import admin_service
from app.services.admin_service import AdminService


class FakeAdminRepository:
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
