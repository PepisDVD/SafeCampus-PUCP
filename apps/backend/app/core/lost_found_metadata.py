"""
📁 apps/backend/app/core/lost_found_metadata.py
🎯 Estructura estandarizada y validación del contrato `metadatos_schema` de las
   categorías Lost & Found, con campos de metadatos gestionables por el admin.
📦 Capa: Core / Dominio

Los metadatos NO provienen de un catálogo fijo: el administrador crea, edita,
activa o desactiva cada campo desde la categoría. Para mantener el JSON
mantenible y escalable, cada campo respeta una estructura estándar:

    {
      "version": 1,
      "campos": [
        {
          "codigo": "NUMERO_SERIE",          # slug estable (no cambia tras crearse)
          "etiqueta": "Número de serie",      # nombre legible editable
          "tipo": "texto" | "numero",
          "requerido": false,
          "participa_en_matching": true,       # sólo permitido en campos textuales
          "orden": 1,
          "activo": true
        }
      ]
    }

Reglas:
  - `etiqueta` es obligatoria; de ella se deriva `codigo` si no se envía uno.
  - `codigo` es estable: se conserva el enviado para no romper datos históricos
    de los casos (que se indexan por `codigo`).
  - Sólo los campos textuales pueden `participa_en_matching`.
  - Los `codigo` se deduplican (con sufijo numérico si colisionan).
"""

import re
import unicodedata
from enum import StrEnum
from typing import Any

from fastapi import HTTPException, status

METADATOS_SCHEMA_VERSION = 1


class MetadatoTipo(StrEnum):
    TEXTO = "texto"
    NUMERO = "numero"


def slug_codigo_campo(value: str) -> str:
    """Deriva un `codigo` estable (MAYÚSCULAS, sin tildes, separado por `_`)."""
    base = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^A-Z0-9]+", "_", base.upper()).strip("_")
    return slug or "CAMPO"


def normalizar_metadatos_schema(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Valida y normaliza el `metadatos_schema` recibido del frontend.

    - Exige `etiqueta`; deriva `codigo` cuando no se envía.
    - Fija `tipo` válido (texto | numero); por defecto texto.
    - Sólo campos textuales pueden `participa_en_matching`.
    - Deduplica `codigo` con sufijo numérico ante colisiones.
    """
    if not raw:
        return {"version": METADATOS_SCHEMA_VERSION, "campos": []}

    campos_raw = raw.get("campos", [])
    if not isinstance(campos_raw, list):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="metadatos_schema.campos debe ser una lista.")

    usados: set[str] = set()
    campos: list[dict[str, Any]] = []
    for orden_default, item in enumerate(campos_raw, start=1):
        if not isinstance(item, dict):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cada metadato debe ser un objeto.")

        etiqueta = str(item.get("etiqueta") or "").strip()
        if not etiqueta:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cada metadato requiere un nombre (etiqueta).")

        tipo_raw = str(item.get("tipo") or MetadatoTipo.TEXTO.value).strip().lower()
        if tipo_raw not in (MetadatoTipo.TEXTO.value, MetadatoTipo.NUMERO.value):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Tipo de metadato no soportado: '{tipo_raw}'.")
        es_textual = tipo_raw == MetadatoTipo.TEXTO.value

        codigo = slug_codigo_campo(str(item.get("codigo") or etiqueta))
        # Resolver colisiones de codigo manteniendo unicidad.
        if codigo in usados:
            sufijo = 2
            while f"{codigo}_{sufijo}" in usados:
                sufijo += 1
            codigo = f"{codigo}_{sufijo}"
        usados.add(codigo)

        try:
            orden = int(item.get("orden", orden_default) or orden_default)
        except (TypeError, ValueError):
            orden = orden_default

        campos.append(
            {
                "codigo": codigo,
                "etiqueta": etiqueta,
                "tipo": tipo_raw,
                "requerido": bool(item.get("requerido", False)),
                "participa_en_matching": bool(item.get("participa_en_matching", False)) and es_textual,
                "orden": orden,
                "activo": bool(item.get("activo", True)),
            }
        )

    campos.sort(key=lambda c: (c["orden"], c["codigo"]))
    return {"version": METADATOS_SCHEMA_VERSION, "campos": campos}


def _campos_activos(schema: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    if not schema:
        return {}
    return {c["codigo"]: c for c in schema.get("campos", []) if c.get("activo")}


def validar_metadatos_caso(metadatos: dict[str, Any] | None, schema: dict[str, Any] | None) -> dict[str, Any]:
    """Valida los `metadatos` enviados al crear/actualizar un caso contra el
    `metadatos_schema` de su categoría.

    - Sólo se aceptan claves de campos activos configurados para la categoría.
    - Valida campos requeridos.
    - Rechaza claves libres no configuradas.
    - Devuelve los metadatos depurados (sólo campos activos válidos).
    """
    metadatos = metadatos or {}
    if not isinstance(metadatos, dict):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="metadatos debe ser un objeto.")

    activos = _campos_activos(schema)

    desconocidas = [k for k in metadatos.keys() if k not in activos]
    if desconocidas:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Metadatos no configurados para la categoría: {', '.join(sorted(desconocidas))}.",
        )

    limpio: dict[str, Any] = {}
    for codigo, campo in activos.items():
        valor = metadatos.get(codigo)
        vacio = valor is None or (isinstance(valor, str) and not valor.strip())
        if vacio:
            if campo.get("requerido"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"El metadato '{campo.get('etiqueta', codigo)}' es obligatorio.",
                )
            continue
        if campo.get("tipo") == MetadatoTipo.NUMERO.value:
            try:
                limpio[codigo] = float(valor) if isinstance(valor, str) else valor
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"El metadato '{campo.get('etiqueta', codigo)}' debe ser numérico.",
                ) from exc
        else:
            limpio[codigo] = str(valor).strip()
    return limpio


def codigos_matching(schema: dict[str, Any] | None) -> list[str]:
    """Códigos de metadatos textuales activos marcados para participar en matching."""
    return [
        c["codigo"]
        for c in _campos_activos(schema).values()
        if c.get("participa_en_matching") and c.get("tipo") == MetadatoTipo.TEXTO.value
    ]
