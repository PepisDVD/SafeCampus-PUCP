from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.maestros import (
    UbicacionMaestraCreateInput,
    UbicacionMaestraUpdateInput,
)
from app.services import maestros_service
from app.services.maestros_service import MaestrosService

UBICACION_ID = str(uuid4())


def _row(**overrides):
    base = {
        "id": UBICACION_ID,
        "codigo": "PABELLON_A",
        "nombre": "Pabellon A",
        "tipo": "PABELLON",
        "latitud": -12.07,
        "longitud": -77.08,
        "activa": True,
        "tiene_relaciones": False,
        "created_at": datetime(2026, 5, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 5, 1, tzinfo=timezone.utc),
    }
    base.update(overrides)
    return base


class FakeMaestrosRepository:
    referenced: bool = False
    create_payloads: list[dict] = []
    update_payloads: list[dict] = []
    deleted: list[str] = []

    def __init__(self, _db):
        pass

    async def list_ubicaciones(self, include_inactive: bool = False):
        return [_row(tiene_relaciones=self.referenced)]

    async def create_ubicacion(self, data):
        FakeMaestrosRepository.create_payloads.append(data)
        return _row(**data)

    async def update_ubicacion(self, ubicacion_id, data):
        FakeMaestrosRepository.update_payloads.append(data)
        return _row(**data)

    async def ubicacion_tiene_relaciones(self, ubicacion_id):
        return self.referenced

    async def delete_ubicacion(self, ubicacion_id):
        FakeMaestrosRepository.deleted.append(ubicacion_id)
        return True


@pytest.fixture(autouse=True)
def _patch_repo(monkeypatch):
    FakeMaestrosRepository.referenced = False
    FakeMaestrosRepository.create_payloads = []
    FakeMaestrosRepository.update_payloads = []
    FakeMaestrosRepository.deleted = []
    monkeypatch.setattr(maestros_service, "MaestrosRepository", FakeMaestrosRepository)


@pytest.mark.anyio
async def test_crear_ubicacion_persiste_tipo():
    await MaestrosService(db=None).crear_ubicacion(  # type: ignore[arg-type]
        UbicacionMaestraCreateInput(
            codigo="lab_quimica",
            nombre="Laboratorio de Quimica",
            tipo="LABORATORIO",
            latitud=-12.07,
            longitud=-77.08,
        )
    )
    payload = FakeMaestrosRepository.create_payloads[0]
    assert payload["tipo"] == "LABORATORIO"
    assert payload["codigo"] == "LAB_QUIMICA"  # se normaliza a mayúsculas


@pytest.mark.anyio
async def test_crear_ubicacion_normaliza_tipo_personalizado():
    await MaestrosService(db=None).crear_ubicacion(  # type: ignore[arg-type]
        UbicacionMaestraCreateInput(
            codigo="aula_especial",
            nombre="Aula Especial",
            tipo="Aula especializada",
            latitud=-12.07,
            longitud=-77.08,
        )
    )
    payload = FakeMaestrosRepository.create_payloads[0]
    assert payload["tipo"] == "AULA_ESPECIALIZADA"


@pytest.mark.anyio
async def test_actualizar_ubicacion_no_modifica_codigo():
    await MaestrosService(db=None).actualizar_ubicacion(  # type: ignore[arg-type]
        UBICACION_ID,
        UbicacionMaestraUpdateInput(
            nombre="Pabellon A renovado",
            tipo="PABELLON",
            latitud=-12.07,
            longitud=-77.08,
            activa=True,
        ),
    )
    payload = FakeMaestrosRepository.update_payloads[0]
    assert "codigo" not in payload
    assert payload["nombre"] == "Pabellon A renovado"


@pytest.mark.anyio
async def test_listar_ubicaciones_expone_tiene_relaciones():
    FakeMaestrosRepository.referenced = True
    items = await MaestrosService(db=None).listar_ubicaciones(include_inactive=True)  # type: ignore[arg-type]
    assert items[0].tiene_relaciones is True


@pytest.mark.anyio
async def test_eliminar_ubicacion_sin_relaciones_borra():
    await MaestrosService(db=None).eliminar_ubicacion(UBICACION_ID)  # type: ignore[arg-type]
    assert FakeMaestrosRepository.deleted == [UBICACION_ID]


@pytest.mark.anyio
async def test_eliminar_ubicacion_con_relaciones_bloquea():
    FakeMaestrosRepository.referenced = True
    with pytest.raises(HTTPException) as exc:
        await MaestrosService(db=None).eliminar_ubicacion(UBICACION_ID)  # type: ignore[arg-type]
    assert exc.value.status_code == 409
    assert FakeMaestrosRepository.deleted == []
