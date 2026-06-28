from datetime import UTC, datetime

from app.api.deps import get_current_user
from app.api.v1.lost_found import get_service
from app.core.constants import EstadoCasoLF, TipoCasoLF, lf_tag_priority, lf_tag_valido
from app.main import app
from app.schemas.auth import AuthUserResponse
from app.schemas.incidente import UsuarioMini
from app.schemas.lost_found import (
    AccesoLfMiResult,
    CasoLfDetail,
    CasoLfListItem,
    CasoLfListResponse,
    ComentarioLfItem,
    ComentarioReaccionResult,
    CustodiaLfItem,
    RecepcionLfMobileResult,
    SupervisorLfItem,
)

CASE_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "00000000-0000-0000-0000-000000000001"


class FakeLostFoundService:
    def __init__(self, acceso: bool = True) -> None:
        self.feed_args = None
        self.operativo_args = None
        self.custodias_args = None
        self.upload_args = None
        self.deleted_comment = None
        self.acceso = acceso
        self.comentario_args = None
        self.reaccion_args = None
        self.fijar_args = None
        self.acceso_set_args = None
        self.recepcion_args = None

    async def tiene_acceso_lf(self, usuario_id, roles) -> bool:
        if "administrador" in roles:
            return True
        return self.acceso

    async def crear_comentario(self, caso_id, usuario_id, body, archivos=None) -> ComentarioLfItem:
        self.comentario_args = (caso_id, usuario_id, body.tag, body.parent_id)
        return ComentarioLfItem(
            id="33333333-3333-3333-3333-333333333333",
            caso_id=caso_id,
            parent_id=body.parent_id,
            autor=None,
            contenido=body.contenido,
            tag=body.tag,
            visible=True,
            created_at=datetime(2026, 6, 25, 10, 0, tzinfo=UTC),
            updated_at=datetime(2026, 6, 25, 10, 0, tzinfo=UTC),
        )

    async def reaccionar_comentario(self, comentario_id, usuario_id) -> ComentarioReaccionResult:
        self.reaccion_args = (comentario_id, usuario_id)
        return ComentarioReaccionResult(destacados=1, reaccionado=True)

    async def fijar_comentario(self, comentario_id, usuario_id, roles, body) -> None:
        self.fijar_args = (comentario_id, usuario_id, body.fijar)

    async def listar_supervisores_acceso(self) -> list[SupervisorLfItem]:
        return [SupervisorLfItem(id=USER_ID, nombre_completo="Ana Perez", email=None, rol="supervisor", asignado=False)]

    async def set_acceso_supervisores(self, usuario_ids, actor_id) -> list[SupervisorLfItem]:
        self.acceso_set_args = (usuario_ids, actor_id)
        return [SupervisorLfItem(id=USER_ID, nombre_completo="Ana Perez", email=None, rol="supervisor", asignado=True)]

    async def obtener_acceso_mi(self, usuario_id, roles) -> AccesoLfMiResult:
        return AccesoLfMiResult(acceso=await self.tiene_acceso_lf(usuario_id, roles))

    async def registrar_recepcion_mobile(self, actor_id, body) -> RecepcionLfMobileResult:
        self.recepcion_args = (actor_id, body.titulo, body.ubicacion_custodia)
        created_at = datetime(2026, 6, 27, 10, 0, tzinfo=UTC)
        return RecepcionLfMobileResult(
            caso={
                "id": CASE_ID,
                "codigo": "LF-202606-00001",
                "estado": EstadoCasoLF.ABIERTO,
                "created_at": created_at,
                "matches_generados": 0,
            },
            custodia=CustodiaLfItem(
                id="22222222-2222-2222-2222-222222222222",
                caso_id=CASE_ID,
                codigo="LF-202606-00001",
                titulo=body.titulo,
                estado="ACTIVA",
                ubicacion_custodia=body.ubicacion_custodia,
                observaciones=body.observaciones_custodia,
                es_perecible=False,
                fecha_recepcion=created_at,
                fecha_vencimiento=created_at,
                created_at=created_at,
                updated_at=created_at,
            ),
        )

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


def _fake_supervisor() -> AuthUserResponse:
    user = _fake_comunidad()
    return user.model_copy(update={"roles": ["supervisor"]})


def _fake_admin() -> AuthUserResponse:
    user = _fake_comunidad()
    return user.model_copy(update={"roles": ["administrador"]})


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


def test_lost_found_mobile_registra_recepcion_con_acceso(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_operador
    try:
        response = client.post(
            "/api/v1/lost-found/mobile/recepciones",
            json={
                "tipo": "ENCONTRADO",
                "titulo": "Casaca encontrada",
                "descripcion": "Casaca negra encontrada durante patrullaje.",
                "categoria_id": CASE_ID,
                "lugar_referencia": "Puerta principal",
                "fecha_evento": "2026-06-27T10:00:00Z",
                "ubicacion_custodia": "Caseta norte",
                "observaciones_custodia": "Recepcion registrada desde mobile.",
            },
        )
        assert response.status_code == 201
        assert response.json()["custodia"]["ubicacion_custodia"] == "Caseta norte"
        assert fake.recepcion_args == (USER_ID, "Casaca encontrada", "Caseta norte")
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lf_tag_catalogo_valida_por_tipo():
    # PERDIDO acepta sus etiquetas; rechaza las de ENCONTRADO.
    assert lf_tag_valido("PERDIDO", "POSIBLE_HALLAZGO") is True
    assert lf_tag_valido("PERDIDO", "RECLAMO") is False
    assert lf_tag_valido("ENCONTRADO", "RECLAMO") is True
    # None (sin etiqueta) y GENERAL siempre válidos.
    assert lf_tag_valido("PERDIDO", None) is True
    assert lf_tag_valido("ENCONTRADO", "GENERAL") is True
    # Prioridades: alta=2 para los hallazgos/reclamos, 0 para general.
    assert lf_tag_priority("PERDIDO", "POSIBLE_HALLAZGO") == 2
    assert lf_tag_priority("PERDIDO", "PISTA") == 1
    assert lf_tag_priority("ENCONTRADO", "GENERAL") == 0


def test_lost_found_crear_comentario_pasa_tag(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_comunidad
    try:
        response = client.post(
            f"/api/v1/lost-found/casos/{CASE_ID}/comentarios",
            data={"contenido": "Creo que lo vi por la cafetería", "tag": "PISTA"},
        )
        assert response.status_code == 201
        assert response.json()["tag"] == "PISTA"
        assert fake.comentario_args == (CASE_ID, USER_ID, "PISTA", None)
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_reaccion_usa_usuario_actual(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_comunidad
    try:
        response = client.post(
            "/api/v1/lost-found/comentarios/22222222-2222-2222-2222-222222222222/reaccion"
        )
        assert response.status_code == 200
        body = ComentarioReaccionResult.model_validate(response.json())
        assert body.reaccionado is True and body.destacados == 1
        assert fake.reaccion_args == ("22222222-2222-2222-2222-222222222222", USER_ID)
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_fijar_comentario(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_comunidad
    try:
        response = client.patch(
            "/api/v1/lost-found/comentarios/22222222-2222-2222-2222-222222222222/fijar",
            json={"fijar": True},
        )
        assert response.status_code == 204
        assert fake.fijar_args == ("22222222-2222-2222-2222-222222222222", USER_ID, True)
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_acceso_gate_bloquea_supervisor_no_asignado(client):
    fake = FakeLostFoundService(acceso=False)
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_supervisor
    try:
        response = client.get("/api/v1/lost-found/casos")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_acceso_gate_permite_supervisor_asignado(client):
    fake = FakeLostFoundService(acceso=True)
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_supervisor
    try:
        response = client.get("/api/v1/lost-found/casos")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_lost_found_acceso_supervisores_solo_admin(client):
    fake = FakeLostFoundService()
    app.dependency_overrides[get_service] = lambda: fake
    app.dependency_overrides[get_current_user] = _fake_admin
    try:
        listar = client.get("/api/v1/lost-found/acceso/supervisores")
        assert listar.status_code == 200
        assert listar.json()[0]["rol"] == "supervisor"
        guardar = client.put(
            "/api/v1/lost-found/acceso/supervisores",
            json={"usuario_ids": [USER_ID]},
        )
        assert guardar.status_code == 200
        assert fake.acceso_set_args == ([USER_ID], USER_ID)
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)
