import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.lost_found import CustodiaPoliticaUpdateInput, MotivoCierreLfCreate
from app.services.lost_found_service import LostFoundService


class FakeRepo:
    def __init__(self, motivo):
        self.motivo = motivo

    async def get_motivo_cierre(self, _ref):
        return self.motivo


def service_with(motivo):
    service = LostFoundService.__new__(LostFoundService)
    service._repo = FakeRepo(motivo)
    return service


@pytest.mark.anyio
async def test_no_permite_cerrar_con_motivo_inactivo():
    service = service_with({"activo": False})
    with pytest.raises(HTTPException) as error:
        await service._validar_motivo_cierre("id", "detalle")
    assert error.value.status_code == 422


@pytest.mark.anyio
async def test_exige_observacion_configurada():
    service = service_with({
        "id": "id", "activo": True, "requiere_observacion": True,
        "clase_cierre": "ADMINISTRATIVO", "requiere_validacion_entrega": False,
    })
    with pytest.raises(HTTPException) as error:
        await service._validar_motivo_cierre("id", "  ")
    assert "observaciones" in error.value.detail


@pytest.mark.anyio
async def test_devolucion_exige_validacion_de_entrega():
    service = service_with({
        "id": "id", "activo": True, "requiere_observacion": False,
        "clase_cierre": "DEVOLUCION", "requiere_validacion_entrega": True,
    })
    with pytest.raises(HTTPException) as error:
        await service._validar_motivo_cierre("id", None)
    assert "verificacion de entrega" in error.value.detail


@pytest.mark.anyio
async def test_acepta_devolucion_activa_con_verificacion():
    motivo = {
        "id": "id", "activo": True, "requiere_observacion": False,
        "clase_cierre": "DEVOLUCION", "requiere_validacion_entrega": True,
    }
    service = service_with(motivo)
    assert await service._validar_motivo_cierre("id", None, validacion_entrega=True) == motivo


@pytest.mark.anyio
async def test_codigo_no_puede_cambiar_despues_de_crear_motivo():
    service = service_with({"id": "id", "codigo": "ORIGINAL", "activo": True})
    data = MotivoCierreLfCreate(
        codigo="MODIFICADO",
        nombre="Motivo",
        clase_cierre="ADMINISTRATIVO",
    )
    with pytest.raises(HTTPException) as error:
        await service.actualizar_motivo_cierre("id", data, "actor")
    assert error.value.status_code == 422
    assert "no puede cambiar" in error.value.detail


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("dias_maximos_custodia", 366),
        ("dias_alerta_vencimiento", 91),
        ("dias_recordatorio_previo", 91),
        ("horas_maximas_perecibles", 169),
        ("horas_alerta_perecible", 73),
    ],
)
def test_politica_custodia_rechaza_limites_superiores(field, value):
    payload = {
        "dias_maximos_custodia": 30,
        "dias_alerta_vencimiento": 7,
        "dias_recordatorio_previo": 3,
        "horas_maximas_perecibles": 24,
        "horas_alerta_perecible": 6,
    }
    payload[field] = value
    with pytest.raises(ValidationError):
        CustodiaPoliticaUpdateInput(**payload)


def test_motivo_rechaza_nombre_vacio_y_validacion_incompatible():
    with pytest.raises(ValidationError):
        MotivoCierreLfCreate(
            codigo="MOTIVO_VALIDO",
            nombre="  ",
            clase_cierre="ADMINISTRATIVO",
            requiere_validacion_entrega=True,
        )
