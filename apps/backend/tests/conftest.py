"""
📁 apps/backend/tests/conftest.py
🎯 Fixtures globales de pytest: sesión de BD de prueba, cliente HTTP, factories.
📦 Capa: Tests
"""

import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"


# TODO: Agregar fixtures de base de datos de prueba y cliente HTTP
# @pytest.fixture
# async def db_session(): ...
# @pytest.fixture
# async def client(): ...
