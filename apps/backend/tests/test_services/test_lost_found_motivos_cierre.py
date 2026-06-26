from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.lost_found import (
    CustodiaPoliticaItem,
    CustodiaPoliticaUpdateInput,
    CustodiaLfUpdateInput,
    DescarteLfInput,
    DevolucionLfInput,
    MotivoCierreLfCreate,
)
from app.services.lost_found_service import LostFoundService


class FakeRepo:
    def __init__(self, motivo):
        self.motivo = motivo

    async def get_motivo_cierre(self, _ref):
        return self.motivo


class FakeAuditRepo:
    def __init__(self) -> None:
        self.created = []

    async def create_registro(self, **kwargs):
        self.created.append(kwargs)


class FakeCustodiaRepo:
    def __init__(self) -> None:
        self.updated = None
        self.historial = []
        self.caso_id = UUID("11111111-1111-1111-1111-111111111111")
        self.custodia = SimpleNamespace(
            id=UUID("22222222-2222-2222-2222-222222222222"),
            caso_id=self.caso_id,
            estado="ACTIVA",
            ubicacion_custodia="Estante A",
            observaciones="Recibido",
            es_perecible=False,
            fecha_recepcion=datetime(2026, 6, 1, 10, tzinfo=timezone.utc),
            fecha_vencimiento=datetime(2026, 7, 20, 10, tzinfo=timezone.utc),
            reclamante_id=None,
            metodo_verificacion=None,
            created_at=datetime(2026, 6, 1, 10, tzinfo=timezone.utc),
            updated_at=datetime(2026, 6, 1, 10, tzinfo=timezone.utc),
        )

    async def get_custodia(self, _custodia_id):
        return self.custodia

    async def update_custodia(self, custodia_id, values):
        self.updated = (custodia_id, values)
        next_fecha = values.get("fecha_vencimiento", self.custodia.fecha_vencimiento)
        next_estado = values.get("estado", self.custodia.estado)
        return {
            "id": str(self.custodia.id),
            "caso_id": str(self.caso_id),
            "codigo": "LF-202606-00001",
            "titulo": "Mochila",
            "estado": next_estado,
            "ubicacion_custodia": values.get("ubicacion_custodia", self.custodia.ubicacion_custodia),
            "observaciones": values.get("observaciones", self.custodia.observaciones),
            "es_perecible": self.custodia.es_perecible,
            "fecha_recepcion": self.custodia.fecha_recepcion,
            "fecha_vencimiento": next_fecha,
            "reclamante_id": None,
            "metodo_verificacion": None,
            "created_at": self.custodia.created_at,
            "updated_at": datetime(2026, 6, 20, 10, tzinfo=timezone.utc),
        }

    async def get_estado(self, _caso_id):
        return {"estado": "EN_CUSTODIA"}

    async def add_historial(self, *args):
        self.historial.append(args)


def service_with(motivo):
    service = LostFoundService.__new__(LostFoundService)
    service._repo = FakeRepo(motivo)
    return service


def custody_service_with(repo: FakeCustodiaRepo, audit: FakeAuditRepo):
    service = LostFoundService.__new__(LostFoundService)
    service._repo = repo
    service._audit = audit
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
async def test_rechaza_motivo_de_clase_distinta_al_descarte():
    service = service_with({
        "id": "id", "activo": True, "requiere_observacion": False,
        "clase_cierre": "ADMINISTRATIVO", "requiere_validacion_entrega": False,
    })
    with pytest.raises(HTTPException) as error:
        await service._validar_motivo_cierre("id", None, clase_cierre="DESCARTE")
    assert error.value.status_code == 422
    assert "DESCARTE" in error.value.detail


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


def test_descarte_otro_exige_detalle_manual():
    with pytest.raises(ValidationError):
        DescarteLfInput(motivo_cierre_id="OTRO", motivo_otro="  ")


def test_devolucion_reclamante_debe_ser_uuid():
    with pytest.raises(ValidationError):
        DevolucionLfInput(reclamante_id="dni-12345678", metodo_verificacion="SSO_PUCP_CARNET")


def test_devolucion_acepta_reclamante_uuid():
    data = DevolucionLfInput(
        reclamante_id="00000000-0000-0000-0000-000000000001",
        metodo_verificacion="SSO_PUCP_CARNET",
    )
    assert str(data.reclamante_id) == "00000000-0000-0000-0000-000000000001"


@pytest.mark.anyio
async def test_actualizar_fecha_custodia_audita_y_deja_historial():
    repo = FakeCustodiaRepo()
    audit = FakeAuditRepo()
    service = custody_service_with(repo, audit)
    politica = CustodiaPoliticaItem(
        dias_maximos_custodia=30,
        dias_alerta_vencimiento=7,
        dias_recordatorio_previo=3,
        horas_maximas_perecibles=24,
        horas_alerta_perecible=6,
    )

    async def obtener_politica():
        return politica

    service.obtener_politica_custodia = obtener_politica
    nueva_fecha = datetime.now(timezone.utc) + timedelta(days=3)

    result = await service.actualizar_custodia(
        "22222222-2222-2222-2222-222222222222",
        "00000000-0000-0000-0000-000000000001",
        CustodiaLfUpdateInput(fecha_vencimiento=nueva_fecha),
    )

    assert result.estado == "PROXIMA_VENCER"
    assert repo.updated[1]["estado"] == "PROXIMA_VENCER"
    assert audit.created[0]["accion"] == "actualizar_custodia"
    assert audit.created[0]["entidad"] == "custodia_objeto"
    assert audit.created[0]["detalle"]["campos_modificados"] == ["estado", "fecha_vencimiento"]
    assert repo.historial[0][3] == "Actualización de custodia"
    assert "Fecha de vencimiento actualizada" in repo.historial[0][5]


def test_estado_custodia_se_recalcula_con_politica_vigente():
    now = datetime(2026, 6, 25, 12, tzinfo=timezone.utc)
    politica = CustodiaPoliticaItem(
        dias_maximos_custodia=30,
        dias_alerta_vencimiento=7,
        dias_recordatorio_previo=3,
        horas_maximas_perecibles=24,
        horas_alerta_perecible=6,
    )
    assert LostFoundService._estado_custodia_por_vencimiento(now - timedelta(minutes=1), False, politica, now) == "VENCIDA"
    assert LostFoundService._estado_custodia_por_vencimiento(now + timedelta(days=3), False, politica, now) == "PROXIMA_VENCER"
    assert LostFoundService._estado_custodia_por_vencimiento(now + timedelta(days=10), False, politica, now) == "ACTIVA"
    assert LostFoundService._estado_custodia_por_vencimiento(now + timedelta(hours=4), True, politica, now) == "PROXIMA_VENCER"


def test_dashboard_agrega_metricas_series_y_actividad():
    now = datetime.now(timezone.utc)
    case_id = "00000000-0000-0000-0000-000000000001"
    current = {
        "casos": [{
            "id": case_id,
            "codigo": "LF-001",
            "titulo": "Mochila",
            "tipo": "ENCONTRADO",
            "estado": "DEVUELTO",
            "categoria": "Accesorios",
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=1),
            "reportante_nombre": "Ana",
            "reportante_apellido": "Pérez",
            "matching_total": 2,
            "matching_confirmados": 1,
        }],
        "custodias": [{
            "id": "00000000-0000-0000-0000-000000000010",
            "caso_id": case_id,
            "estado": "DEVUELTA",
            "fecha_recepcion": now - timedelta(days=2),
            "fecha_vencimiento": now + timedelta(days=5),
            "fecha_devolucion": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1),
            "codigo": "LF-001",
            "titulo": "Mochila",
            "categoria": "Accesorios",
        }],
    }
    politica = CustodiaPoliticaItem(
        dias_maximos_custodia=30,
        dias_alerta_vencimiento=7,
        dias_recordatorio_previo=3,
        horas_maximas_perecibles=24,
        horas_alerta_perecible=6,
    )
    result = LostFoundService._build_dashboard(
        current,
        {"casos": [], "custodias": []},
        now - timedelta(days=7),
        now + timedelta(days=1),
        politica,
    )
    assert result["casos_totales"]["valor"] == 1
    assert result["tasa_recuperacion"]["valor"] == 100
    assert result["tiempo_promedio_devolucion"]["valor"] == 1
    assert result["por_categoria"][0]["etiqueta"] == "Accesorios"
    assert result["por_tipo"][0] == {"clave": "ENCONTRADO", "etiqueta": "Encontrado", "total": 1}
    assert result["actividad_reciente"][0]["matching_confirmado"] is True
