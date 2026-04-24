from datetime import UTC, datetime

import pytest

from app.integrations.supabase_auth import SupabaseAuthUser
from app.services.user_sync_service import UserSyncService


class FakeAuthClient:
    def __init__(self, user: SupabaseAuthUser) -> None:
        self._user = user

    async def fetch_user(self, access_token: str) -> SupabaseAuthUser:
        return self._user


class FakeRepository:
    def __init__(self, *, existing_user: dict | None = None, roles: list[str] | None = None) -> None:
        self.existing_user = existing_user
        self.roles = roles or []
        self.created_user_id = "new-user-id"
        self.assigned_default_role = False
        self.session_inserted = False

    async def find_user_by_auth_user_id(self, auth_user_id: str):
        return self.existing_user

    async def find_user_by_email(self, email: str):
        return self.existing_user

    async def create_user(self, **kwargs):
        return self.created_user_id

    async def update_user(self, **kwargs):
        return None

    async def list_role_names(self, user_id: str):
        if self.assigned_default_role and not self.roles:
            return ["comunidad"]
        return self.roles

    async def assign_role_if_missing(self, *, user_id, role_id):
        self.assigned_default_role = True

    async def insert_session(self, **kwargs):
        assert isinstance(kwargs["fecha_expiracion"], datetime)
        assert kwargs["fecha_expiracion"].tzinfo == UTC
        self.session_inserted = True


@pytest.mark.asyncio
async def test_sync_user_creates_new_user_and_assigns_default_role(monkeypatch):
    fake_repository = FakeRepository(existing_user=None, roles=[])
    fake_auth_client = FakeAuthClient(
        SupabaseAuthUser(
            auth_user_id="0f2e8a8f-78b6-4bdf-8f03-2ce34f4af2c7",
            email="nuevo.usuario@pucp.edu.pe",
            email_verified=True,
            provider="google",
            nombre="Nuevo",
            apellido="Usuario",
            avatar_url=None,
        )
    )

    monkeypatch.setattr(
        "app.services.user_sync_service.settings.DEFAULT_COMMUNITY_ROLE_ID",
        "0c21c807-e3d3-4daa-b67f-b8929b3ac10d",
    )

    service = UserSyncService(repository=fake_repository, auth_client=fake_auth_client)

    result = await service.sync_user(
        access_token="invalid.jwt.token",
        ip_origen="127.0.0.1",
        user_agent="pytest",
    )

    assert result.is_new_user is True
    assert result.email == "nuevo.usuario@pucp.edu.pe"
    assert "comunidad" in result.roles
    assert fake_repository.assigned_default_role is True
    assert fake_repository.session_inserted is True


@pytest.mark.asyncio
async def test_sync_user_updates_existing_user_without_overriding_roles(monkeypatch):
    fake_repository = FakeRepository(
        existing_user={"id": "existing-user-id", "email": "admin@pucp.edu.pe"},
        roles=["admin"],
    )
    fake_auth_client = FakeAuthClient(
        SupabaseAuthUser(
            auth_user_id="8a248b8b-a775-4ac9-ac5a-146f78667131",
            email="admin@pucp.edu.pe",
            email_verified=True,
            provider="google",
            nombre="Admin",
            apellido="PUCP",
            avatar_url=None,
        )
    )

    monkeypatch.setattr(
        "app.services.user_sync_service.settings.DEFAULT_COMMUNITY_ROLE_ID",
        "0c21c807-e3d3-4daa-b67f-b8929b3ac10d",
    )

    service = UserSyncService(repository=fake_repository, auth_client=fake_auth_client)

    result = await service.sync_user(
        access_token="invalid.jwt.token",
        ip_origen=None,
        user_agent=None,
    )

    assert result.is_new_user is False
    assert result.roles == ["admin"]
    assert fake_repository.assigned_default_role is False
    assert fake_repository.session_inserted is True
