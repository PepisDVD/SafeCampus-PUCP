"""Lost & Found — alinea los metadatos de las categorías seed a la estructura estándar.

Los metadatos de categorías ahora son gestionables por el administrador, pero
mantienen una estructura estándar por campo. Esta migración (re)establece el
``metadatos_schema`` canónico de las categorías semilla para dejarlas alineadas
con dicho contrato. Es idempotente: vuelve a fijar el schema por ``codigo``.
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260623_0023"
down_revision: str | None = "20260622_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# codigo -> (etiqueta, tipo)
CAMPOS: dict[str, tuple[str, str]] = {
    "MARCA": ("Marca", "texto"),
    "MODELO": ("Modelo", "texto"),
    "COLOR": ("Color", "texto"),
    "NUMERO_SERIE": ("Número de serie", "texto"),
    "TIPO_DOCUMENTO": ("Tipo de documento", "texto"),
    "ENTIDAD_EMISORA": ("Entidad emisora", "texto"),
    "CANTIDAD": ("Cantidad", "numero"),
    "TIPO_LLAVE": ("Tipo de llave", "texto"),
    "DISTINTIVO_LLAVERO": ("Distintivo del llavero", "texto"),
    "TIPO_PRENDA": ("Tipo de prenda", "texto"),
    "TALLA_APROXIMADA": ("Talla aproximada", "texto"),
    "CONDICION_OBJETO": ("Condición del objeto", "texto"),
}


def _schema(campos: list[tuple[str, bool, bool]]) -> str:
    salida = []
    for orden, (codigo, requerido, matching) in enumerate(campos, start=1):
        etiqueta, tipo = CAMPOS[codigo]
        salida.append(
            {
                "codigo": codigo,
                "etiqueta": etiqueta,
                "tipo": tipo,
                "requerido": requerido,
                "participa_en_matching": matching and tipo == "texto",
                "orden": orden,
                "activo": True,
            }
        )
    return json.dumps({"version": 1, "campos": salida}, ensure_ascii=False)


# codigo_categoria -> campos [(codigo, requerido, participa_matching)]
CATEGORIAS: dict[str, list[tuple[str, bool, bool]]] = {
    "ELECTRONICOS": [("MARCA", False, True), ("MODELO", False, True), ("COLOR", False, True), ("NUMERO_SERIE", False, True)],
    "DOCUMENTOS": [("TIPO_DOCUMENTO", True, True), ("ENTIDAD_EMISORA", False, True)],
    "ROPA_Y_ACCESORIOS": [("TIPO_PRENDA", False, True), ("COLOR", False, True), ("MARCA", False, True), ("TALLA_APROXIMADA", False, False)],
    "LLAVES": [("TIPO_LLAVE", False, True), ("DISTINTIVO_LLAVERO", False, True), ("CANTIDAD", False, False)],
    "UTILES_ACADEMICOS": [("MARCA", False, True), ("COLOR", False, True), ("CONDICION_OBJETO", False, False)],
    "OTROS": [("COLOR", False, True), ("CONDICION_OBJETO", False, False)],
}


def upgrade() -> None:
    conn = op.get_bind()
    update = sa.text(
        """
        UPDATE sc_lost_found.categoria_objeto
        SET metadatos_schema = CAST(:schema AS jsonb)
        WHERE codigo = :codigo
        """
    )
    for codigo, campos in CATEGORIAS.items():
        conn.execute(update, {"codigo": codigo, "schema": _schema(campos)})


def downgrade() -> None:
    # No se revierte el contenido de metadatos (alineación idempotente).
    pass
