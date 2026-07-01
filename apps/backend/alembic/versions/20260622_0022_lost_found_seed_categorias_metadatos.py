"""Lost & Found — seed de categorías base con su metadatos_schema.

Inserta el catálogo inicial de categorías de objetos con su configuración de
metadatos (contrato ``metadatos_schema`` versión 1). Es idempotente gracias a
``ON CONFLICT (codigo) DO NOTHING``: no sobreescribe categorías ya existentes.

Snapshot autocontenido: las etiquetas/tipos de los campos de metadatos se fijan
aquí para no depender del catálogo de la aplicación (que puede evolucionar).
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260622_0022"
down_revision: str | None = "20260622_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Catálogo controlado de campos (snapshot): codigo -> (etiqueta, tipo)
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
    """Construye el metadatos_schema. campos = [(codigo, requerido, participa_matching)]."""
    salida = []
    for orden, (codigo, requerido, matching) in enumerate(campos, start=1):
        etiqueta, tipo = CAMPOS[codigo]
        salida.append(
            {
                "codigo": codigo,
                "etiqueta": etiqueta,
                "tipo": tipo,
                "requerido": requerido,
                # Sólo los campos textuales pueden participar en matching.
                "participa_en_matching": matching and tipo == "texto",
                "orden": orden,
                "activo": True,
            }
        )
    return json.dumps({"version": 1, "campos": salida}, ensure_ascii=False)


# (codigo, nombre, descripcion, es_perecible, orden_visual, campos)
CATEGORIAS = [
    (
        "ELECTRONICOS",
        "Electrónicos",
        "Laptops, celulares, tablets, cargadores, audífonos.",
        False,
        1,
        [
            ("MARCA", False, True),
            ("MODELO", False, True),
            ("COLOR", False, True),
            ("NUMERO_SERIE", False, True),
        ],
    ),
    (
        "DOCUMENTOS",
        "Documentos e identificaciones",
        "DNI, carné universitario, pasaporte, tarjetas.",
        False,
        2,
        [("TIPO_DOCUMENTO", True, True), ("ENTIDAD_EMISORA", False, True)],
    ),
    (
        "ROPA_Y_ACCESORIOS",
        "Ropa y accesorios personales",
        "Casacas, mochilas, gorras, lentes, bufandas.",
        False,
        3,
        [
            ("TIPO_PRENDA", False, True),
            ("COLOR", False, True),
            ("MARCA", False, True),
            ("TALLA_APROXIMADA", False, False),
        ],
    ),
    (
        "LLAVES",
        "Llaves y tarjetas de acceso",
        "Llaves de casa, auto, candado, llaveros, tarjetas.",
        False,
        4,
        [
            ("TIPO_LLAVE", False, True),
            ("DISTINTIVO_LLAVERO", False, True),
            ("CANTIDAD", False, False),
        ],
    ),
    (
        "UTILES_ACADEMICOS",
        "Útiles académicos",
        "Libros, cuadernos, calculadoras, USB.",
        False,
        5,
        [("MARCA", False, True), ("COLOR", False, True), ("CONDICION_OBJETO", False, False)],
    ),
    (
        "OTROS",
        "Otros",
        "Objetos que no encajan en las categorías anteriores.",
        False,
        6,
        [("COLOR", False, True), ("CONDICION_OBJETO", False, False)],
    ),
]


def upgrade() -> None:
    conn = op.get_bind()
    insert = sa.text(
        """
        INSERT INTO sc_lost_found.categoria_objeto
            (codigo, nombre, descripcion, activa, es_perecible, orden_visual, metadatos_schema)
        VALUES
            (:codigo, :nombre, :descripcion, true, :es_perecible, :orden_visual, CAST(:schema AS jsonb))
        ON CONFLICT (codigo) DO NOTHING
        """
    )
    for codigo, nombre, descripcion, perecible, orden, campos in CATEGORIAS:
        conn.execute(
            insert,
            {
                "codigo": codigo,
                "nombre": nombre,
                "descripcion": descripcion,
                "es_perecible": perecible,
                "orden_visual": orden,
                "schema": _schema(campos),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    # Sólo elimina las categorías semilla que no estén referenciadas por casos.
    conn.execute(
        sa.text(
            """
            DELETE FROM sc_lost_found.categoria_objeto cat
            WHERE cat.codigo = ANY(:codigos)
              AND NOT EXISTS (
                  SELECT 1 FROM sc_lost_found.caso_lost_found c WHERE c.categoria_id = cat.id
              )
            """
        ),
        {"codigos": [c[0] for c in CATEGORIAS]},
    )
