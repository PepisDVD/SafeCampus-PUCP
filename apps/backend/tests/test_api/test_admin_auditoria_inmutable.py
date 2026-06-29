from uuid import uuid4

import pytest

AUDITORIA_BASE_PATH = "/api/v1/admin/auditoria"
AUDITORIA_ITEM_PATH = f"{AUDITORIA_BASE_PATH}/{uuid4()}"


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("post", AUDITORIA_BASE_PATH),
        ("put", AUDITORIA_ITEM_PATH),
        ("patch", AUDITORIA_ITEM_PATH),
        ("delete", AUDITORIA_ITEM_PATH),
    ],
)
def test_auditoria_no_permite_mutaciones_via_api(client, method, path):
    """Prueba funcional: la auditoria es de solo lectura via API."""
    response = client.request(
        method.upper(),
        path,
        json={
            "modulo": "usuarios",
            "accion": "forzar_modificacion",
            "detalle": {"resultado": "alterado"},
        },
    )

    assert response.status_code in {404, 405}
