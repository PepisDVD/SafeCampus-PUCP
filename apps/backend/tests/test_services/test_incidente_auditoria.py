import pytest

from app.core.constants import EstadoIncidente
from app.schemas.incidente import IncidenteAsignacionUpdate, IncidenteEstadoUpdate
from app.services import incidente_service
from app.services.incidente_service import IncidenteService


class FakeIncidenteRepository:
    def __init__(self, _db):
        pass

    async def update_estado(
        self,
        incidente_id: str,
        new_estado: str,
        ejecutor_id: str,
        comentario: str | None,
    ):
        return {
            "id": incidente_id,
            "codigo": "INC-20260513-0001",
            "estado_anterior": "RECIBIDO",
            "estado_nuevo": new_estado,
            "comentario": comentario,
        }

    async def assign_operador(
        self,
        incidente_id: str,
        operador_id: str,
        ejecutor_id: str,
        comentario: str | None,
    ):
        return {
            "id": incidente_id,
            "codigo": "INC-20260513-0001",
            "estado": "EN_ATENCION",
            "operador_anterior_id": None,
            "operador_nuevo_id": operador_id,
            "supervisor_id": ejecutor_id,
            "comentario": comentario,
        }

    async def get_participantes(self, _incidente_id: str):
        return None

    async def upsert_expediente_cierre(self, **data):
        return {"id": "44444444-4444-4444-4444-444444444444"}


def test_estado_actual_query_includes_fecha_resolucion():
    import inspect

    from app.repositories.incidente_repository import IncidenteRepository

    source = inspect.getsource(IncidenteRepository.get_estado_actual)
    assert "Incidente.fecha_resolucion" in source


class FakeAuditoriaRepository:
    created: list[dict] = []

    def __init__(self, _db):
        pass

    async def create_registro(self, **data):
        self.created.append(data)


class FakeNotificacionRepository:
    def __init__(self, _db):
        pass


async def _fake_detalle(self, incidente_id: str):
    class FakeDetalle:
        def __init__(self, current_id: str) -> None:
            self.id = current_id

        def model_dump(self, **_kwargs):
            return {"id": self.id, "codigo": "INC-20260513-0001"}

        def __eq__(self, other):
            return other == {"id": self.id}

    return FakeDetalle(incidente_id)


@pytest.mark.anyio
async def test_cambiar_estado_registra_auditoria(monkeypatch):
    FakeAuditoriaRepository.created = []
    monkeypatch.setattr(incidente_service, "IncidenteRepository", FakeIncidenteRepository)
    monkeypatch.setattr(incidente_service, "AuditoriaRepository", FakeAuditoriaRepository)
    monkeypatch.setattr(incidente_service, "NotificacionRepository", FakeNotificacionRepository)
    monkeypatch.setattr(IncidenteService, "obtener_detalle", _fake_detalle)

    service = IncidenteService(db=None)  # type: ignore[arg-type]
    response = await service.cambiar_estado(
        incidente_id="11111111-1111-1111-1111-111111111111",
        ejecutor_id="22222222-2222-2222-2222-222222222222",
        data=IncidenteEstadoUpdate(
            estado=EstadoIncidente.EN_ATENCION,
            comentario="Atencion iniciada",
        ),
    )

    assert response == {"id": "11111111-1111-1111-1111-111111111111"}
    audit = FakeAuditoriaRepository.created[0]
    assert audit["modulo"] == "incidentes"
    assert audit["accion"] == "cambiar_estado"
    assert audit["entidad"] == "incidente"
    assert audit["detalle"]["estado_anterior"] == "RECIBIDO"
    assert audit["detalle"]["estado_nuevo"] == "EN_ATENCION"
    assert audit["detalle"]["codigo"] == "INC-20260513-0001"


@pytest.mark.anyio
async def test_cerrar_incidente_genera_expediente_y_auditoria(monkeypatch):
    FakeAuditoriaRepository.created = []
    monkeypatch.setattr(incidente_service, "IncidenteRepository", FakeIncidenteRepository)
    monkeypatch.setattr(incidente_service, "AuditoriaRepository", FakeAuditoriaRepository)
    monkeypatch.setattr(incidente_service, "NotificacionRepository", FakeNotificacionRepository)
    monkeypatch.setattr(IncidenteService, "obtener_detalle", _fake_detalle)

    service = IncidenteService(db=None)  # type: ignore[arg-type]
    await service.cambiar_estado(
        incidente_id="11111111-1111-1111-1111-111111111111",
        ejecutor_id="22222222-2222-2222-2222-222222222222",
        data=IncidenteEstadoUpdate(
            estado=EstadoIncidente.CERRADO,
            comentario="Caso cerrado",
            resumen_cierre="El incidente fue atendido, documentado y cerrado correctamente.",
            resultado_cierre="Cerrado sin escalamiento adicional.",
        ),
    )

    acciones = [registro["accion"] for registro in FakeAuditoriaRepository.created]
    assert "cambiar_estado" in acciones
    assert "generar_expediente_cierre" in acciones


@pytest.mark.anyio
async def test_asignar_operador_registra_auditoria(monkeypatch):
    FakeAuditoriaRepository.created = []
    monkeypatch.setattr(incidente_service, "IncidenteRepository", FakeIncidenteRepository)
    monkeypatch.setattr(incidente_service, "AuditoriaRepository", FakeAuditoriaRepository)
    monkeypatch.setattr(incidente_service, "NotificacionRepository", FakeNotificacionRepository)
    monkeypatch.setattr(IncidenteService, "obtener_detalle", _fake_detalle)

    service = IncidenteService(db=None)  # type: ignore[arg-type]
    await service.asignar_operador(
        incidente_id="11111111-1111-1111-1111-111111111111",
        ejecutor_id="22222222-2222-2222-2222-222222222222",
        data=IncidenteAsignacionUpdate(
            operador_asignado_id="33333333-3333-3333-3333-333333333333",
            comentario="Derivado al operador de turno",
        ),
    )

    audit = FakeAuditoriaRepository.created[0]
    assert audit["accion"] == "asignar_operador"
    assert audit["detalle"]["operador_anterior_id"] is None
    assert audit["detalle"]["operador_nuevo_id"] == "33333333-3333-3333-3333-333333333333"
    assert audit["detalle"]["supervisor_id"] == "22222222-2222-2222-2222-222222222222"
