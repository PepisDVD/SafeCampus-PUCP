"""Tests del matcher determinista de ubicaciones del chatbot."""

import time

import pytest

from app.services import ubicacion_matcher as um
from app.services.ubicacion_matcher import (
    UbicacionMatcher,
    _haversine_km,
    match_location,
    normalize,
)

CATALOG = [
    {"id": "1", "codigo": "PAB-V", "nombre": "Pabellón V", "latitud": -12.07, "longitud": -77.08},
    {
        "id": "2",
        "codigo": "BIB-CEN",
        "nombre": "Biblioteca Central",
        "latitud": -12.071,
        "longitud": -77.081,
    },
    {
        "id": "3",
        "codigo": "CAF-LET",
        "nombre": "Cafetería de Letras",
        "latitud": -12.072,
        "longitud": -77.082,
    },
]


def test_normalize_quita_tildes_y_simbolos():
    assert normalize("  Pabellón  V! ") == "pabellon v"


def test_match_nombre_literal_en_el_mensaje():
    match = match_location("mi amigo se cayó en el pabellón V", CATALOG)
    assert match is not None
    assert match.nombre == "Pabellón V"
    assert match.latitud == -12.07
    assert match.score == 1.0


def test_match_es_insensible_a_tildes():
    match = match_location("estoy en pabellon v", CATALOG)
    assert match is not None
    assert match.nombre == "Pabellón V"


def test_match_nombre_compuesto():
    match = match_location("hay humo en la biblioteca central", CATALOG)
    assert match is not None
    assert match.nombre == "Biblioteca Central"


def test_sin_match_devuelve_none():
    assert match_location("no tengo idea de donde estoy", CATALOG) is None


def test_texto_vacio_devuelve_none():
    assert match_location("", CATALOG) is None


def test_mencion_parcial_no_supera_umbral_conservador():
    # Solo "biblioteca" no debe resolver con confianza a "Biblioteca Central".
    assert match_location("biblioteca", CATALOG) is None


def test_haversine_km_aproximado():
    # ~0.01 grados de latitud ≈ 1.11 km.
    distancia = _haversine_km(-12.00, -77.00, -12.01, -77.00)
    assert 1.0 < distancia < 1.2


@pytest.mark.anyio
async def test_resolve_by_coords_encuentra_la_mas_cercana(monkeypatch):
    catalog = [
        {
            "id": "1",
            "codigo": "PAB-V",
            "nombre": "Pabellon V",
            "latitud": -12.07,
            "longitud": -77.08,
        },
        {"id": "2", "codigo": "BIB", "nombre": "Biblioteca", "latitud": -12.09, "longitud": -77.1},
    ]
    # Cache caliente para no depender de la BD.
    monkeypatch.setattr(um, "_catalog_cache", catalog)
    monkeypatch.setattr(um, "_catalog_loaded_at", time.monotonic())
    matcher = UbicacionMatcher(repo=None)  # type: ignore[arg-type]

    cerca = await matcher.resolve_by_coords(-12.0701, -77.0801)
    assert cerca is not None
    assert cerca.nombre == "Pabellon V"

    lejos = await matcher.resolve_by_coords(-12.5, -77.5)
    assert lejos is None
