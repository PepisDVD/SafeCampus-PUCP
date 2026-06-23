from datetime import UTC, datetime

from app.api.deps import get_current_user
from app.api.v1.lost_found import get_service
from app.core.constants import EstadoCasoLF, TipoCasoLF
from app.main import app
from app.schemas.auth import AuthUserResponse
from app.schemas.incidente import UsuarioMini
from app.schemas.lost_found import CasoLfDetail, CasoLfListItem, CasoLfListResponse

CASE_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "00000000-0000-0000-0000-000000000001"


class FakeLostFoundService:
    def __init__(self) -> None:
        self.feed_args = None
        self.operativo_args = None
        self.custodias_args = None
        self.upload_args = None
        self.deleted_comment = None

    async def listar_feed(self, **kwargs) -> list[CasoLfListItem]:
        self.feed_args = kwargs
        return [
            CasoLfListItem(
                id=CASE_ID,
                codigo="LF-202605-00001",
                tipo=TipoCasoLF.PERDIDO,
                estado=EstadoCasoLF.ABIERTO,
                titulo="Mochila negra",
                descripcion="Mochila negra con cuadernos y cargador.",
                categoria_id=None,
                categoria_nombre="Ropa y accesorios personales",
                lugar_referencia="Biblioteca Central",
                fecha_evento=datetime(2026, 5, 30, 10, 0, tzinfo=UTC),
                foto_url=None,
                conteo_comentarios=0,
                reportante=UsuarioMini(id=USER_ID, nombre_completo="Ana P.", email=None, avatar_url=None, rol=None),
                created_at=datetime(2026, 5, 30, 11, 0, tzinfo=UTC),
            )
        ]

    async def listar_operativo(self, **kwargs) -> list[CasoLfListItem]:
        self.operativo_args = kwargs
        return []

    async def listar_custodias(self, **kwargs) -> dict:
        self.custodias_args = kwargs
        return {"items": [], "total": 0, "page": kwargs["page"], "per_page": kwargs["per_page"]}

    async def subir_fotos_archivos(self, caso_id, usuario_id, roles, archivos) -> CasoLfDetail:
        self.upload_args = (caso_id, usuario_id, roles, len(archivos))
        return CasoLfDetail(
            id=caso_id,
            codigo="LF-202605-00001",
            tipo=TipoCasoLF.PERDIDO,
            estado=EstadoCasoLF.ABIERTO,
            titulo="Mochila negra",
            descripcion="Mochila negra con cuadernos y cargador.",
            categoria_id=None,
            categoria_nombre="Ropa y accesorios personales",
            lugar_referencia="Biblioteca Central",
            fecha_evento=datetime(2026, 5, 30, 10, 0, tzinfo=UTC),
            foto_url="https://example.test/foto.webp",
            foto_adicional_urls=[],
            etiquetas=[],
            conteo_comentarios=0,
            reportante=UsuarioMini(id=USER_ID, nombre_completo="Ana Perez", email="ana@pucp.edu.pe", avatar_url=None, rol=None),
            created_at=datetime(2026, 5, 30, 11, 0, tzinfo=UTC),
            updated_at=datetime(2026, 5, 30, 11, 5, tzinfo=UTC),
            historial=[],
            comentarios=[],
        )

    async def eliminar_comentario_propio(self, comentario_id, usuario_id) -> None:
        self.deleted_comment = (comentario_id, usuario_id)


def _fake_comunidad() -> AuthUserResponse:
    return AuthUserResponse(
        id=USER_ID,
        email="ana@pucp.edu.pe",
        nombre="Ana",
        apellido="Perez",
        avatar_url=None,
        codigo_institucional=None,
        telefono=None,
        departamento=None,
        roles=["comunidad"],
    )


def _fake_operador() -> AuthUserResponse:
    user = _fake_comunidad()
    return user.model_copy(update={"roles": ["operador"]})


def test_lost_found_feed_comunidad_acepta_filtros_y_cursor(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    try:
        response = client.get(
            "/api/v1/lost-found/casos/feed",
            params={
                "search": "mochila",
                "tipo": "PERDIDO",
                "lugar": "Biblioteca",
                "color": "negro",
                "cursor": "2026-05-30T12:00:00Z",
                "limit": "1",
            },
        )
        assert response.status_code == 200
        payload = CasoLfListResponse.model_validate(response.json())
        assert payload.total == 1
        assert payload.items[0].reportante is not None
        assert payload.items[0].reportante.email is None
        assert fake.feed_args["search"] == "mochila"
        assert fake.feed_args["lugar"] == "Biblioteca"
        assert fake.feed_args["color"] == "negro"
        assert fake.feed_args["cursor"] is not None
    finally:
        app.dependency_overrides.pop(get_service, None)


def test_lost_found_upload_fotos_permite_usuario_autenticado(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_comunidad
    try:
        response = client.post(
            f"/api/v1/lost-found/casos/{CASE_ID}/fotos/upload",
            files={"archivos": ("foto.webp", b"x" * 1024, "image/webp")},
        )
        assert response.status_code == 200
        assert response.json()["foto_url"] == "https://example.test/foto.webp"
        assert fake.upload_args == (CASE_ID, USER_ID, ["comunidad"], 1)
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_delete_comentario_propio_usa_usuario_actual(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_comunidad
    try:
        response = client.delete("/api/v1/lost-found/comentarios/22222222-2222-2222-2222-222222222222")
        assert response.status_code == 204
        assert fake.deleted_comment == ("22222222-2222-2222-2222-222222222222", USER_ID)
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_operativo_acepta_filtros_multiselect(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_operador
    try:
        response = client.get(
            "/api/v1/lost-found/casos",
            params={
                "tipo": "PERDIDO,ENCONTRADO",
                "estado": "ABIERTO,EN_REVISION",
                "categoria_id": f"{CASE_ID},{USER_ID}",
            },
        )
        assert response.status_code == 200
        assert fake.operativo_args["tipos"] == ["PERDIDO", "ENCONTRADO"]
        assert fake.operativo_args["estados"] == ["ABIERTO", "EN_REVISION"]
        assert fake.operativo_args["categoria_ids"] == [CASE_ID, USER_ID]
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_custodias_acepta_filtros_multiselect(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_operador
    try:
        response = client.get(
            "/api/v1/lost-found/custodias",
            params={
                "estado": "ACTIVA,VENCIDA",
                "vencimiento": "proxima,vencida",
            },
        )
        assert response.status_code == 200
        assert fake.custodias_args["estados"] == ["ACTIVA", "VENCIDA"]
        assert fake.custodias_args["vencimientos"] == ["proxima", "vencida"]
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)
