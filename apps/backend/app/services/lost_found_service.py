from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import EstadoCasoLF
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.lost_found_repository import LostFoundRepository
from app.repositories.notificacion_repository import NotificacionRepository
from app.schemas.incidente import UsuarioMini
from app.schemas.lost_found import (
    CancelarCasoLfInput,
    CasoLfCreated,
    CasoLfCreateInput,
    CasoLfDetail,
    CasoLfEstadoUpdate,
    CasoLfFotosInput,
    CasoLfListItem,
    CategoriaLfCreate,
    CategoriaLfItem,
    ComentarioLfCreateInput,
    ComentarioLfItem,
    ComentarioVisibilidadInput,
    ConfiguracionLfItem,
    ConfiguracionLfUpdateInput,
    CustodiaLfCreateInput,
    CustodiaLfItem,
    CustodiaLfUpdateInput,
    DescarteLfInput,
    DevolucionLfInput,
    KpisLfResponse,
    MatchLfItem,
    MatchLfResponderInput,
    ParticipacionLfInput,
)
from app.services.storage_service import StorageService

OPERATIVO_ROLES = {"supervisor", "operador", "administrador"}
CHAT_STATES = {"ABIERTO", "EN_REVISION"}
TRANSITIONS = {
    "ABIERTO": {"EN_REVISION", "EN_CUSTODIA", "CERRADO"},
    "EN_REVISION": {"CONFIRMADO", "ABIERTO", "CERRADO"},
    "CONFIRMADO": {"EN_CUSTODIA", "DEVUELTO", "CERRADO"},
    "EN_CUSTODIA": {"DEVUELTO", "DESCARTADO", "CERRADO"},
    "DEVUELTO": {"CERRADO"},
    "DESCARTADO": {"CERRADO"},
    "CERRADO": set(),
}


class LostFoundService:
    _MIME_PERMITIDOS = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/gif",
    }
    _MAX_BYTES = 10 * 1024 * 1024
    _MAX_FOTOS_POR_CASO = 3

    def __init__(self, db: AsyncSession) -> None:
        self._repo = LostFoundRepository(db)
        self._audit = AuditoriaRepository(db)
        self._notify = NotificacionRepository(db)

    async def listar_categorias(self, include_inactive: bool = False) -> list[CategoriaLfItem]:
        return [CategoriaLfItem(**row) for row in await self._repo.list_categorias(include_inactive)]

    async def crear_categoria(self, data: CategoriaLfCreate, actor_id: str) -> CategoriaLfItem:
        row = await self._repo.upsert_categoria(data.model_dump())
        await self._audit_lf(actor_id, "LF_CATEGORIA_MODIFICADA", "categoria_objeto", row["id"], {"accion": "crear", "nombre": row["nombre"]})
        return CategoriaLfItem(**row)

    async def actualizar_categoria(self, categoria_id: str, data: CategoriaLfCreate, actor_id: str) -> CategoriaLfItem:
        row = await self._repo.update_categoria(categoria_id, data.model_dump())
        if not row:
            raise HTTPException(status_code=404, detail="Categoria no encontrada.")
        await self._audit_lf(actor_id, "LF_CATEGORIA_MODIFICADA", "categoria_objeto", row["id"], {"accion": "actualizar", "nombre": row["nombre"]})
        return CategoriaLfItem(**row)

    async def crear_caso(self, reportante_id: str, data: CasoLfCreateInput) -> CasoLfCreated:
        payload = data.model_dump()
        payload["tipo"] = data.tipo.value
        payload["ts_busqueda"] = self._build_search(payload)
        creado = await self._repo.create_caso(reportante_id, payload)
        await self._audit_lf(reportante_id, "LF_CASO_CREADO", "caso_lost_found", creado["id"], {"codigo": creado["codigo"], "tipo_caso": data.tipo.value, "categoria_id": data.categoria_id})
        matches = await self._generar_matches(creado["id"], reportante_id)
        return CasoLfCreated(**creado, matches_generados=matches)

    async def listar_feed(
        self,
        *,
        search: str | None,
        tipo: str | None,
        estado: str | None,
        categoria_id: str | None,
        lugar: str | None,
        fecha_desde: datetime | None,
        fecha_hasta: datetime | None,
        color: str | None,
        cursor: datetime | None,
        limit: int,
    ) -> list[CasoLfListItem]:
        rows = await self._repo.list_feed(
            search=search,
            tipo=tipo,
            estado=estado,
            categoria_id=categoria_id,
            lugar=lugar,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            color=color,
            cursor=cursor,
            limit=max(1, min(limit, 100)),
        )
        return [self._map_list(row, public=True) for row in rows]

    async def listar_mis_casos(self, usuario_id: str, limit: int) -> list[CasoLfListItem]:
        return [self._map_list(row) for row in await self._repo.list_by_reportante(usuario_id, max(1, min(limit, 100)))]

    async def listar_operativo(
        self,
        *,
        search: str | None,
        tipos: list[str] | None,
        estados: list[str] | None,
        categoria_ids: list[str] | None,
        cursor: datetime | None,
        limit: int,
    ) -> list[CasoLfListItem]:
        return [
            self._map_list(row)
            for row in await self._repo.list_operativo(
                search=search,
                tipos=tipos,
                estados=estados,
                categoria_ids=categoria_ids,
                cursor=cursor,
                limit=max(1, min(limit, 200)),
            )
        ]

    async def obtener_detalle(self, ref: str, usuario_id: str, roles: list[str]) -> CasoLfDetail:
        row = await self._repo.get_detail_by_ref(ref)
        if not row:
            raise HTTPException(status_code=404, detail="Caso Lost & Found no encontrado.")
        is_owner = str(row["reportante_id"]) == usuario_id
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        if row["estado"] == "CERRADO" and not is_owner and not is_operativo:
            raise HTTPException(status_code=403, detail="No tienes acceso a este caso.")
        historial = await self._repo.list_historial(str(row["id"])) if is_owner or is_operativo else []
        comentarios = self._mark_deletable(await self._repo.list_comentarios(str(row["id"]), include_hidden=is_operativo), usuario_id)
        return self._map_detail(row, historial, comentarios, public=not is_owner and not is_operativo)

    async def cambiar_estado(self, caso_id: str, actor_id: str, data: CasoLfEstadoUpdate) -> CasoLfDetail:
        actual = await self._repo.get_estado(caso_id)
        if not actual:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        self._ensure_transition(str(actual["estado"]), data.estado.value)
        result = await self._repo.update_estado(
            caso_id=caso_id,
            estado=data.estado.value,
            ejecutor_id=actor_id,
            comentario=data.comentario,
            motivo_cierre=data.motivo_cierre.value if data.motivo_cierre else None,
            observaciones_cierre=data.observaciones_cierre,
        )
        await self._audit_lf(actor_id, "LF_ESTADO_CAMBIADO", "caso_lost_found", caso_id, {"estado_anterior": result["estado_anterior"], "estado_nuevo": result["estado_nuevo"], "motivo": data.motivo_cierre})
        if data.estado in {EstadoCasoLF.DEVUELTO, EstadoCasoLF.DESCARTADO}:
            await self._repo.update_estado(caso_id=caso_id, estado="CERRADO", ejecutor_id=actor_id, comentario="Cierre automatico post resolucion", motivo_cierre=(data.motivo_cierre.value if data.motivo_cierre else data.estado.value), observaciones_cierre=data.observaciones_cierre)
        return await self.obtener_detalle(caso_id, actor_id, ["administrador"])

    async def cancelar_caso(self, caso_id: str, usuario_id: str, data: CancelarCasoLfInput) -> CasoLfDetail:
        actual = await self._repo.get_estado(caso_id)
        if not actual or str(actual["reportante_id"]) != usuario_id:
            raise HTTPException(status_code=404, detail="Caso propio no encontrado.")
        if actual["estado"] == "CERRADO":
            raise HTTPException(status_code=422, detail="El caso ya esta cerrado.")
        await self._repo.update_estado(caso_id=caso_id, estado="CERRADO", ejecutor_id=usuario_id, comentario=data.observaciones, motivo_cierre="CANCELADO_USUARIO", observaciones_cierre=data.observaciones)
        await self._audit_lf(usuario_id, "LF_CASO_CERRADO", "caso_lost_found", caso_id, {"motivo_cierre": "CANCELADO_USUARIO"})
        return await self.obtener_detalle(caso_id, usuario_id, ["comunidad"])

    async def actualizar_fotos(
        self,
        caso_id: str,
        usuario_id: str,
        roles: list[str],
        data: CasoLfFotosInput,
    ) -> CasoLfDetail:
        actual = await self._repo.get_estado(caso_id)
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        if not actual or (str(actual["reportante_id"]) != usuario_id and not is_operativo):
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        if actual["estado"] == "CERRADO":
            raise HTTPException(status_code=422, detail="No se pueden actualizar fotos de un caso cerrado.")
        if not await self._repo.update_fotos(
            caso_id,
            foto_url=data.foto_url,
            foto_adicional_urls=data.foto_adicional_urls,
        ):
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        await self._audit_lf(usuario_id, "LF_FOTOS_ACTUALIZADAS", "caso_lost_found", caso_id, {"total_adicionales": len(data.foto_adicional_urls)})
        return await self.obtener_detalle(caso_id, usuario_id, roles)

    async def subir_fotos_archivos(
        self,
        caso_id: str,
        usuario_id: str,
        roles: list[str],
        archivos: list[UploadFile],
    ) -> CasoLfDetail:
        actual = await self._repo.get_estado(caso_id)
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        if not actual or (str(actual["reportante_id"]) != usuario_id and not is_operativo):
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        if actual["estado"] == "CERRADO":
            raise HTTPException(status_code=422, detail="No se pueden actualizar fotos de un caso cerrado.")
        if not archivos:
            raise HTTPException(status_code=422, detail="Debes adjuntar al menos 1 imagen.")
        if len(archivos) > self._MAX_FOTOS_POR_CASO:
            raise HTTPException(status_code=422, detail="Solo puedes adjuntar hasta 3 imagenes por caso.")

        storage = StorageService()
        urls: list[str] = []
        for archivo in archivos:
            mime = archivo.content_type or ""
            if mime not in self._MIME_PERMITIDOS:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Tipo de archivo no permitido. Solo se aceptan imagenes (jpg, png, webp, heic, gif).",
                )
            contenido = await archivo.read()
            if len(contenido) > self._MAX_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Cada archivo debe pesar como maximo 10 MB.",
                )
            nombre_seguro = (archivo.filename or "foto").replace("/", "_").replace("\\", "_")
            ruta = f"lost-found/{caso_id}/{uuid4().hex}_{nombre_seguro}"
            url = await storage.upload(
                bucket=settings.SUPABASE_STORAGE_BUCKET,
                path=ruta,
                content=contenido,
                content_type=mime,
            )
            urls.append(url)

        foto_principal = urls[0]
        foto_adicionales = urls[1:self._MAX_FOTOS_POR_CASO]
        if not await self._repo.update_fotos(
            caso_id,
            foto_url=foto_principal,
            foto_adicional_urls=foto_adicionales,
        ):
            raise HTTPException(status_code=404, detail="Caso no encontrado.")

        await self._audit_lf(
            usuario_id,
            "LF_FOTOS_SUBIDAS",
            "caso_lost_found",
            caso_id,
            {
                "total": len(urls),
                "principal": bool(foto_principal),
            },
        )
        return await self.obtener_detalle(caso_id, usuario_id, roles)

    async def listar_matches(self, caso_id: str, usuario_id: str, roles: list[str]) -> list[MatchLfItem]:
        caso = await self._repo.get_estado(caso_id)
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        if not caso or (str(caso["reportante_id"]) != usuario_id and not is_operativo):
            raise HTTPException(status_code=403, detail="No puedes ver matches de este caso.")
        items: list[MatchLfItem] = []
        for row in await self._repo.list_matches_for_case(caso_id):
            match = row["match"]
            contraparte_id = match.caso_encontrado_id if str(match.caso_perdido_id) == caso_id else match.caso_perdido_id
            contraparte = await self._repo.get_detail_by_ref(str(contraparte_id))
            items.append(MatchLfItem(
                id=str(match.id),
                caso_perdido_id=str(match.caso_perdido_id),
                caso_encontrado_id=str(match.caso_encontrado_id),
                score_total=float(match.score_total),
                score_detalle=match.score_detalle or {},
                estado=match.estado,
                caso_contraparte=self._map_list(contraparte, public=True) if contraparte else None,
                created_at=match.created_at,
            ))
        return items

    async def responder_match(self, match_id: str, usuario_id: str, roles: list[str], data: MatchLfResponderInput) -> None:
        match = await self._repo.get_match(match_id)
        if not match:
            raise HTTPException(status_code=404, detail="Match no encontrado.")
        perdido = await self._repo.get_estado(str(match.caso_perdido_id))
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        if not perdido or (str(perdido["reportante_id"]) != usuario_id and not is_operativo):
            raise HTTPException(status_code=403, detail="No puedes responder este match.")
        estado = "CONFIRMADO" if data.confirmar else "DESCARTADO"
        await self._repo.update_match_estado(match_id, estado, usuario_id, data.comentario)
        if data.confirmar:
            await self._repo.update_estado(caso_id=str(match.caso_perdido_id), estado="CONFIRMADO", ejecutor_id=usuario_id, comentario=data.comentario)
            await self._repo.update_estado(caso_id=str(match.caso_encontrado_id), estado="CONFIRMADO", ejecutor_id=usuario_id, comentario=f"Match confirmado {match_id}")
        else:
            await self._repo.update_estado(caso_id=str(match.caso_perdido_id), estado="ABIERTO", ejecutor_id=usuario_id, comentario=data.comentario)
        await self._audit_lf(usuario_id, "LF_MATCH_RESPONDIDO", "match_sugerido", match_id, {"estado": estado, "score": float(match.score_total)})

    async def listar_comentarios(self, caso_id: str, roles: list[str], usuario_id: str) -> list[ComentarioLfItem]:
        rows = await self._repo.list_comentarios(caso_id, include_hidden=bool(OPERATIVO_ROLES.intersection(roles)))
        return [self._map_comment(row) for row in self._mark_deletable(rows, usuario_id)]

    async def crear_comentario(self, caso_id: str, usuario_id: str, data: ComentarioLfCreateInput) -> ComentarioLfItem:
        actual = await self._repo.get_estado(caso_id)
        if not actual or str(actual["estado"]) not in CHAT_STATES:
            raise HTTPException(status_code=404, detail="Caso activo no encontrado.")
        if data.parent_id:
            parent = await self._repo.get_comentario_meta(data.parent_id)
            if not parent or str(parent["caso_id"]) != caso_id or not parent["visible"]:
                raise HTTPException(status_code=422, detail="Comentario padre invalido.")
        elif await self._repo.count_root_comentarios(caso_id) >= 200:
            raise HTTPException(status_code=422, detail="El hilo alcanzo el limite de comentarios principales.")
        row = await self._repo.create_comentario(caso_id, usuario_id, data.contenido.strip(), data.parent_id)
        await self._audit_lf(usuario_id, "LF_COMENTARIO_CREADO", "comentario_caso_lf", str(row["id"]), {"caso_id": caso_id})
        participantes = await self._repo.list_participantes(caso_id)
        for p in participantes:
            destinatario = str(p["usuario_id"])
            if destinatario != usuario_id:
                await self._notify.create_inapp(destinatario_id=destinatario, tipo_evento="LF_COMENTARIO_NUEVO", asunto=f"Nuevo comentario en {actual['codigo']}", contenido=f"Hay actividad en el caso {actual['codigo']}.")
        return self._map_comment(row)

    async def actualizar_participacion(self, caso_id: str, usuario_id: str, data: ParticipacionLfInput) -> None:
        await self._repo.upsert_participacion(caso_id, usuario_id, data.suscrito, marcar_leido=data.marcar_leido)

    async def eliminar_comentario_propio(self, comentario_id: str, usuario_id: str) -> None:
        comentario = await self._repo.get_comentario_meta(comentario_id)
        if not comentario or str(comentario["autor_id"]) != usuario_id or not comentario["visible"]:
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        if comentario["created_at"] < datetime.now(timezone.utc) - timedelta(minutes=5):
            raise HTTPException(status_code=422, detail="Solo puedes eliminar comentarios dentro de los primeros 5 minutos.")
        if not await self._repo.delete_own_comentario(comentario_id, usuario_id, "Eliminado por el autor"):
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        await self._audit_lf(usuario_id, "LF_COMENTARIO_ELIMINADO", "comentario_caso_lf", comentario_id, {"caso_id": str(comentario["caso_id"])})

    async def moderar_comentario(self, comentario_id: str, actor_id: str, data: ComentarioVisibilidadInput) -> None:
        if not await self._repo.update_comentario_visibility(comentario_id, data.visible, actor_id, data.motivo):
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        await self._audit_lf(actor_id, "LF_COMENTARIO_MODERADO", "comentario_caso_lf", comentario_id, {"visible": data.visible, "motivo": data.motivo})

    async def crear_custodia(self, caso_id: str, actor_id: str, data: CustodiaLfCreateInput) -> CustodiaLfItem:
        caso = await self._repo.get_detail_by_ref(caso_id)
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        row = await self._repo.create_custodia(caso_id, actor_id, {
            "ubicacion_custodia": data.ubicacion_custodia,
            "observaciones": data.observaciones,
            "es_perecible": bool(data.es_perecible),
        })
        await self._repo.update_estado(caso_id=caso_id, estado="EN_CUSTODIA", ejecutor_id=actor_id, comentario=data.observaciones)
        await self._audit_lf(actor_id, "LF_CUSTODIA_REGISTRADA", "custodia_objeto", row["id"], {"caso_id": caso_id, "ubicacion": data.ubicacion_custodia})
        return CustodiaLfItem(**row)

    async def listar_custodias(
        self,
        *,
        estados: list[str] | None,
        search: str | None,
        vencimientos: list[str] | None,
        page: int,
        per_page: int,
    ) -> dict[str, Any]:
        safe_page = max(1, page)
        safe_per_page = max(1, min(per_page, 100))
        rows, total = await self._repo.list_custodias(
            estados=estados,
            search=search,
            vencimientos=vencimientos,
            page=safe_page,
            per_page=safe_per_page,
        )
        return {
            "items": [CustodiaLfItem(**row) for row in rows],
            "total": total,
            "page": safe_page,
            "per_page": safe_per_page,
        }

    async def actualizar_custodia(self, custodia_id: str, data: CustodiaLfUpdateInput) -> CustodiaLfItem:
        row = await self._repo.update_custodia(custodia_id, data.model_dump(exclude_none=True))
        if not row:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        return CustodiaLfItem(**row)

    async def registrar_devolucion(self, custodia_id: str, actor_id: str, data: DevolucionLfInput) -> None:
        custodia = await self._repo.get_custodia(custodia_id)
        if not custodia:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        await self._repo.update_custodia(custodia_id, {"estado": "DEVUELTA", "reclamante_id": UUID(data.reclamante_id), "entregado_por_id": UUID(actor_id), "metodo_verificacion": data.metodo_verificacion, "observaciones": data.observaciones})
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="DEVUELTO", ejecutor_id=actor_id, comentario=data.observaciones, motivo_cierre="DEVUELTO", observaciones_cierre=data.observaciones)
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="CERRADO", ejecutor_id=actor_id, comentario="Cierre automatico por devolucion", motivo_cierre="DEVUELTO", observaciones_cierre=data.observaciones)
        await self._audit_lf(actor_id, "LF_DEVOLUCION_REALIZADA", "custodia_objeto", custodia_id, {"reclamante_id": data.reclamante_id, "metodo_verificacion": data.metodo_verificacion})

    async def registrar_descarte(self, custodia_id: str, actor_id: str, data: DescarteLfInput) -> None:
        custodia = await self._repo.get_custodia(custodia_id)
        if not custodia:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        await self._repo.update_custodia(custodia_id, {"estado": "DESCARTADA", "destino_descarte": data.destino_descarte, "motivo_descarte": data.motivo})
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="DESCARTADO", ejecutor_id=actor_id, comentario=data.observaciones or data.motivo, motivo_cierre="DESCARTADO", observaciones_cierre=data.observaciones or data.motivo)
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="CERRADO", ejecutor_id=actor_id, comentario="Cierre automatico por descarte", motivo_cierre="DESCARTADO", observaciones_cierre=data.observaciones or data.motivo)
        await self._audit_lf(actor_id, "LF_DESCARTE_EJECUTADO", "custodia_objeto", custodia_id, {"motivo": data.motivo, "destino": data.destino_descarte})

    async def obtener_kpis(self) -> KpisLfResponse:
        return KpisLfResponse(**await self._repo.get_kpis())

    async def listar_configuracion(self) -> list[ConfiguracionLfItem]:
        return [ConfiguracionLfItem(**row) for row in await self._repo.get_config()]

    async def actualizar_configuracion(self, key: str, actor_id: str, data: ConfiguracionLfUpdateInput) -> ConfiguracionLfItem:
        row = await self._repo.update_config(key, data.value, data.descripcion, actor_id)
        await self._audit_lf(actor_id, "LF_CONFIG_MODIFICADA", "configuracion_lf", None, {"parametro": key, "valor_nuevo": data.value})
        return ConfiguracionLfItem(**row)

    async def _generar_matches(self, caso_id: str, actor_id: str) -> int:
        caso = await self._repo.get_detail_by_ref(caso_id)
        if not caso:
            return 0
        config = await self._repo.get_config_value("matching") or {"umbral": 0.55}
        umbral = float(config.get("umbral", 0.55))
        created = 0
        for candidate in await self._repo.find_match_candidates(caso):
            score, detalle = self._score(caso, candidate)
            if score < umbral:
                continue
            perdido_id = str(caso["id"] if caso["tipo"] == "PERDIDO" else candidate["id"])
            encontrado_id = str(caso["id"] if caso["tipo"] == "ENCONTRADO" else candidate["id"])
            match = await self._repo.create_match(perdido_id, encontrado_id, score, detalle)
            if match:
                created += 1
                await self._repo.update_estado(caso_id=perdido_id, estado="EN_REVISION", ejecutor_id=actor_id, comentario="Match sugerido por motor deterministico")
                await self._repo.update_estado(caso_id=encontrado_id, estado="EN_REVISION", ejecutor_id=actor_id, comentario="Match sugerido por motor deterministico")
                await self._audit_lf(actor_id, "LF_MATCH_GENERADO", "match_sugerido", match["id"], {"caso_perdido_id": perdido_id, "caso_encontrado_id": encontrado_id, "score": score})
        return created

    @staticmethod
    def _score(caso: dict[str, Any], candidate: dict[str, Any]) -> tuple[float, dict[str, Any]]:
        categoria = 1.0 if caso.get("categoria_id") and caso.get("categoria_id") == candidate.get("categoria_id") else 0.0
        text_a = " ".join(str(caso.get(k) or "") for k in ("titulo", "descripcion", "marca", "color_principal"))
        text_b = " ".join(str(candidate.get(k) or "") for k in ("titulo", "descripcion", "marca", "color_principal"))
        texto = SequenceMatcher(None, text_a.lower(), text_b.lower()).ratio()
        lugar = SequenceMatcher(None, str(caso.get("lugar_referencia") or "").lower(), str(candidate.get("lugar_referencia") or "").lower()).ratio()
        fecha = 0.0
        if caso.get("fecha_evento") and candidate.get("fecha_evento"):
            delta = abs((caso["fecha_evento"] - candidate["fecha_evento"]).total_seconds()) / 86400
            fecha = max(0.0, 1.0 - min(delta, 7) / 7)
        meta = 0.0
        if caso.get("color_principal") and caso.get("color_principal") == candidate.get("color_principal"):
            meta += 0.5
        if caso.get("marca") and caso.get("marca") == candidate.get("marca"):
            meta += 0.5
        detalle = {"categoria": categoria, "texto": round(texto, 3), "lugar": round(lugar, 3), "fecha": round(fecha, 3), "metadatos": round(meta, 3)}
        total = categoria * 0.25 + texto * 0.30 + lugar * 0.20 + fecha * 0.15 + meta * 0.10
        return round(total, 4), detalle

    @staticmethod
    def _ensure_transition(from_estado: str, to_estado: str) -> None:
        if to_estado not in TRANSITIONS.get(from_estado, set()):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Transicion invalida: {from_estado} -> {to_estado}.")

    @staticmethod
    def _build_search(data: dict[str, Any]) -> str:
        return " ".join(str(data.get(k) or "") for k in ("titulo", "descripcion", "lugar_referencia", "color_principal", "marca", "subcategoria")).lower()

    async def _audit_lf(self, usuario_id: str | None, accion: str, entidad: str | None, entidad_id: str | None, detalle: dict[str, Any]) -> None:
        await self._audit.create_registro(usuario_id=usuario_id, modulo="LOST_FOUND", accion=accion, entidad=entidad, entidad_id=entidad_id, detalle=detalle)

    @staticmethod
    def _mark_deletable(rows: list[dict[str, Any]], usuario_id: str) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        for row in rows:
            row["puede_eliminar"] = (
                str(row.get("autor_id")) == usuario_id
                and bool(row.get("visible"))
                and row.get("created_at") >= now - timedelta(minutes=5)
            )
        return rows

    @staticmethod
    def _usuario(row: dict[str, Any], prefix: str = "", public: bool = False) -> UsuarioMini | None:
        user_id = (
            row.get(f"{prefix}id")
            or row.get(f"{prefix}autor_id")
            or row.get(f"{prefix}reportante_id")
            or row.get(f"{prefix}ejecutado_por_id")
            or row.get("reportante_id")
        )
        if not user_id:
            return None
        first_name = row.get(f"{prefix}nombre") or row.get("reportante_nombre") or row.get("autor_nombre") or ""
        last_name = row.get(f"{prefix}apellido") or row.get("reportante_apellido") or row.get("autor_apellido") or ""
        if public:
            initial = f" {str(last_name).strip()[:1]}." if last_name else ""
            return UsuarioMini(id=str(user_id), nombre_completo=(f"{first_name}{initial}".strip() or "Usuario"), email=None, avatar_url=None, rol=row.get(f"{prefix}rol") or row.get("autor_rol"))
        nombre = f"{first_name} {last_name}".strip() or "Usuario"
        return UsuarioMini(id=str(user_id), nombre_completo=nombre, email=row.get(f"{prefix}email") or row.get("reportante_email") or row.get("autor_email"), avatar_url=row.get(f"{prefix}avatar_url") or row.get("reportante_avatar_url") or row.get("autor_avatar_url"), rol=row.get(f"{prefix}rol") or row.get("autor_rol"))

    @classmethod
    def _map_list(cls, row: dict[str, Any], public: bool = False) -> CasoLfListItem:
        return CasoLfListItem(
            id=str(row["id"]),
            codigo=row["codigo"],
            tipo=row["tipo"],
            estado=row["estado"],
            titulo=row["titulo"],
            descripcion=row["descripcion"],
            categoria_id=str(row["categoria_id"]) if row.get("categoria_id") else None,
            categoria_nombre=row.get("categoria_nombre"),
            subcategoria=row.get("subcategoria"),
            lugar_referencia=row.get("lugar_referencia"),
            fecha_evento=row.get("fecha_evento"),
            foto_url=row.get("foto_url"),
            color_principal=row.get("color_principal"),
            marca=row.get("marca"),
            conteo_comentarios=row.get("conteo_comentarios") or 0,
            ultimo_comentario=row.get("ultimo_comentario"),
            ultimo_comentario_at=row.get("ultimo_comentario_at"),
            reportante=cls._usuario(row, public=public),
            created_at=row["created_at"],
        )

    @classmethod
    def _map_detail(cls, row: dict[str, Any], historial: list[dict[str, Any]], comentarios: list[dict[str, Any]], public: bool = False) -> CasoLfDetail:
        base = cls._map_list(row, public=public).model_dump()
        base.pop("reportante", None)
        return CasoLfDetail(
            **base,
            reportante=cls._usuario(row, public=public),
            contacto_info=None if public else row.get("contacto_info"),
            foto_adicional_urls=row.get("foto_adicional_urls") or [],
            etiquetas=row.get("etiquetas") or [],
            motivo_cierre=row.get("motivo_cierre"),
            observaciones_cierre=row.get("observaciones_cierre"),
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
            updated_at=row["updated_at"],
            historial=[
                {
                    "id": str(h["id"]),
                    "estado_anterior": h.get("estado_anterior"),
                    "estado_nuevo": h["estado_nuevo"],
                    "accion": h["accion"],
                    "comentario": h.get("comentario"),
                    "ejecutado_por": cls._usuario(h, "ejecutor_"),
                    "created_at": h["created_at"],
                }
                for h in historial
            ],
            comentarios=[cls._map_comment(c) for c in comentarios],
        )

    @classmethod
    def _map_comment(cls, row: dict[str, Any]) -> ComentarioLfItem:
        return ComentarioLfItem(
            id=str(row["id"]),
            caso_id=str(row["caso_id"]),
            parent_id=str(row["parent_id"]) if row.get("parent_id") else None,
            autor=cls._usuario(row, "autor_"),
            contenido=row["contenido"],
            visible=bool(row["visible"]),
            motivo_ocultamiento=row.get("motivo_ocultamiento"),
            puede_eliminar=bool(row.get("puede_eliminar", False)),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
