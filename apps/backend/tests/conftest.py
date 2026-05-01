import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres?ssl=require",
)
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("ALLOWED_INSTITUTIONAL_DOMAIN", "pucp.edu.pe")
os.environ.setdefault(
    "DEFAULT_COMMUNITY_ROLE_ID",
    "0c21c807-e3d3-4daa-b67f-b8929b3ac10d",
)
os.environ["DEBUG"] = "true"

from app.main import app  # noqa: E402


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
