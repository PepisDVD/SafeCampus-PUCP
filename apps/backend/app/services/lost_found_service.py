import re
import unicodedata
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditAccion, AuditEntidad, AuditModulo, AuditResultado, build_detalle
from app.core.config import settings
from app.core.constants import EstadoCasoLF, lf_tag_priority, lf_tag_valido
from app.core.lost_found_metadata import (
    codigos_matching,
    normalizar_metadatos_schema,
    validar_metadatos_caso,
)
from app.repositories.auditoria_repository import AuditoriaRepository
from app.repositories.lost_found_repository import LostFoundRepository
from app.repositories.notificacion_repository import NotificacionRepository
from app.schemas.incidente import UsuarioMini
from app.schemas.lost_found import (
    CancelarCasoLfInput,
    CasoCierreInput,
    CasoLfCreated,
    CasoLfCreateInput,
    CasoLfDetail,
    CasoVisibilidadInput,
    CasoLfEstadoUpdate,
    CasoLfFotosInput,
    CasoLfListItem,
    CasoLfUpdateInput,
    CategoriaLfCreate,
    CategoriaLfItem,
    AccesoLfMiResult,
    ComentarioFijarInput,
    ComentarioLfCreateInput,
    ComentarioLfEditInput,
    ComentarioLfItem,
    ComentarioReaccionResult,
    ComentarioVisibilidadInput,
    SupervisorLfItem,
    ConfiguracionLfItem,
    ConfiguracionLfUpdateInput,
    CustodiaLfCreateInput,
    CustodiaLfItem,
    CustodiaLfUpdateInput,
    CustodiaPoliticaItem,
    CustodiaPoliticaUpdateInput,
    DescarteLfInput,
    DevolucionLfInput,
    DashboardLfResponse,
    KpisLfResponse,
    MatchingConfigItem,
    MatchingConfigUpdateInput,
    MatchLfItem,
    MatchLfResponderInput,
    MotivoCierreLfCreate,
    MotivoCierreLfItem,
    ParticipacionLfInput,
)
from app.services.storage_service import StorageService

OPERATIVO_ROLES = {"supervisor", "operador", "administrador"}
CHAT_STATES = {"ABIERTO", "EN_REVISION"}
MATCHING_CONFIG_KEY = "matching.sugerencia"
MATCHING_UMBRAL_DEFAULT = 0.55
MATCHING_CONFIG_VERSION = 1

CUSTODIA_POLITICA_KEY = "custodia.politica"
CUSTODIA_POLITICA_VERSION = 1
CUSTODIA_POLITICA_DEFAULT = {
    "dias_maximos_custodia": 30,
    "dias_alerta_vencimiento": 7,
    "dias_recordatorio_previo": 3,
    "horas_maximas_perecibles": 24,
    "horas_alerta_perecible": 6,
    "version": CUSTODIA_POLITICA_VERSION,
}
COMENTARIOS_LISTA_NEGRA_KEY = "comentarios.lista_negra"
COMENTARIOS_PROFUNDIDAD_KEY = "comentarios.profundidad_maxima"
COMENTARIOS_PROFUNDIDAD_DEFAULT = 6
COMENTARIOS_PROFUNDIDAD_MAX = 12
COMENTARIO_ELIMINADO_PLACEHOLDER = "Comentario eliminado."
LISTA_NEGRA_DEFAULT = [
    "idiota", "imbecil", "estupido", "estupida", "tarado", "tarada", "mierda",
    "puta", "puto", "pendejo", "pendeja", "cabron", "cabrona", "marica",
    "maricon", "concha", "carajo", "verga", "huevon", "huevona",
    "conchatumadre", "ctm", "malparido", "gonorrea",
]
# Estados de caso que NO generan recordatorios de custodia.
CASO_ESTADOS_SIN_RECORDATORIO = {"DEVUELTO", "DESCARTADO", "CERRADO"}
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

    async def listar_motivos_cierre(self, include_inactive: bool = False) -> list[MotivoCierreLfItem]:
        return [MotivoCierreLfItem(**row) for row in await self._repo.list_motivos_cierre(include_inactive)]

    async def crear_motivo_cierre(self, data: MotivoCierreLfCreate, actor_id: str) -> MotivoCierreLfItem:
        row = await self._repo.create_motivo_cierre(data.model_dump())
        await self._audit_lf(actor_id, "LF_MOTIVO_CIERRE_CREADO", "motivo_cierre_lf", row["id"], {"after": row})
        return MotivoCierreLfItem(**row)

    async def actualizar_motivo_cierre(self, motivo_id: str, data: MotivoCierreLfCreate, actor_id: str) -> MotivoCierreLfItem:
        before = await self._repo.get_motivo_cierre(motivo_id)
        if not before:
            raise HTTPException(status_code=404, detail="Motivo de cierre no encontrado.")
        if data.codigo != before["codigo"]:
            raise HTTPException(
                status_code=422,
                detail="El codigo no puede cambiar despues de crear el motivo de cierre.",
            )
        row = await self._repo.update_motivo_cierre(motivo_id, data.model_dump())
        accion = "LF_MOTIVO_CIERRE_DESACTIVADO" if before["activo"] and not row["activo"] else "LF_MOTIVO_CIERRE_ACTUALIZADO"
        await self._audit_lf(actor_id, accion, "motivo_cierre_lf", motivo_id, {"before": before, "after": row})
        return MotivoCierreLfItem(**row)

    async def crear_categoria(self, data: CategoriaLfCreate, actor_id: str) -> CategoriaLfItem:
        payload = data.model_dump()
        payload["metadatos_schema"] = normalizar_metadatos_schema(payload.get("metadatos_schema"))
        payload["codigo"] = self._slug_codigo(payload.get("codigo") or payload["nombre"])
        row = await self._repo.upsert_categoria(payload)
        await self._audit_categoria(
            actor_id,
            "LF_CATEGORIA_CREADA",
            row["id"],
            before={},
            after=row,
            resumen=f"Categoría '{row['nombre']}' ({row['codigo']}) creada.",
        )
        return CategoriaLfItem(**row)

    async def actualizar_categoria(self, categoria_id: str, data: CategoriaLfCreate, actor_id: str) -> CategoriaLfItem:
        before = await self._repo.get_categoria(categoria_id)
        if not before:
            raise HTTPException(status_code=404, detail="Categoria no encontrada.")
        payload = data.model_dump()
        payload["metadatos_schema"] = normalizar_metadatos_schema(payload.get("metadatos_schema"))
        payload["codigo"] = self._slug_codigo(payload.get("codigo") or before["codigo"] or payload["nombre"])
        row = await self._repo.update_categoria(categoria_id, payload)
        if not row:
            raise HTTPException(status_code=404, detail="Categoria no encontrada.")

        desactivada = bool(before.get("activa")) and not row.get("activa")
        metadatos_cambiados = before.get("metadatos_schema") != row.get("metadatos_schema")
        if desactivada:
            accion, resumen = "LF_CATEGORIA_DESACTIVADA", f"Categoría '{row['nombre']}' desactivada."
        elif metadatos_cambiados:
            accion, resumen = "LF_CATEGORIA_METADATOS_ACTUALIZADOS", f"Metadatos de la categoría '{row['nombre']}' actualizados."
        else:
            accion, resumen = "LF_CATEGORIA_ACTUALIZADA", f"Categoría '{row['nombre']}' actualizada."
        await self._audit_categoria(actor_id, accion, row["id"], before=before, after=row, resumen=resumen)
        return CategoriaLfItem(**row)

    async def crear_caso(self, reportante_id: str, data: CasoLfCreateInput) -> CasoLfCreated:
        payload = data.model_dump()
        payload["tipo"] = data.tipo.value
        categoria = await self._repo.get_categoria(data.categoria_id)
        if not categoria:
            raise HTTPException(status_code=422, detail="La categoría seleccionada no existe.")
        schema = categoria.get("metadatos_schema")
        payload["metadatos"] = validar_metadatos_caso(payload.get("metadatos"), schema)
        # Sólo los campos textuales marcados para matching entran al motor de matching.
        matching_terms = [str(payload["metadatos"][c]) for c in codigos_matching(schema) if payload["metadatos"].get(c)]
        payload["ts_busqueda"] = " ".join(filter(None, [self._build_search(payload), *matching_terms]))
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
        publicado_desde: datetime | None = None,
        lat: float | None = None,
        lng: float | None = None,
        radio_km: float | None = None,
        metadatos: dict[str, Any] | None = None,
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
            publicado_desde=publicado_desde,
            lat=lat,
            lng=lng,
            radio_km=radio_km,
            metadatos=metadatos,
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
        # Un hilo oculto sólo es accesible para su dueño o el equipo operativo/admin.
        if row.get("oculto") and not is_owner and not is_operativo:
            raise HTTPException(status_code=404, detail="Caso Lost & Found no encontrado.")
        historial = await self._repo.list_historial(str(row["id"])) if is_owner or is_operativo else []
        comentarios = await self._repo.list_comentarios(str(row["id"]), include_hidden=is_operativo, usuario_id=usuario_id)
        comentarios = self._compute_profundidades(comentarios)
        comentarios = self._mark_comment_flags(comentarios, usuario_id, is_operativo, is_owner=is_owner, caso_tipo=str(row["tipo"]))
        max_profundidad = await self._obtener_profundidad_maxima()
        return self._map_detail(
            row,
            historial,
            comentarios,
            public=not is_owner and not is_operativo,
            mostrar_eliminado=is_operativo,
            profundidad_maxima=max_profundidad,
        )

    async def cambiar_estado(self, caso_id: str, actor_id: str, data: CasoLfEstadoUpdate) -> CasoLfDetail:
        actual = await self._repo.get_estado(caso_id)
        if not actual:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        self._ensure_transition(str(actual["estado"]), data.estado.value)
        motivo = None
        if data.estado in {EstadoCasoLF.CERRADO, EstadoCasoLF.DEVUELTO, EstadoCasoLF.DESCARTADO}:
            motivo = await self._validar_motivo_cierre(data.motivo_cierre_id, data.observaciones_cierre)
        result = await self._repo.update_estado(
            caso_id=caso_id,
            estado=data.estado.value,
            ejecutor_id=actor_id,
            comentario=data.comentario,
            motivo_cierre=data.motivo_cierre.value if data.motivo_cierre else None,
            motivo_cierre_id=motivo["id"] if motivo else None,
            observaciones_cierre=data.observaciones_cierre,
        )
        await self._audit_lf(actor_id, "LF_ESTADO_CAMBIADO", "caso_lost_found", caso_id, {"estado_anterior": result["estado_anterior"], "estado_nuevo": result["estado_nuevo"], "motivo": data.motivo_cierre})
        if data.estado in {EstadoCasoLF.DEVUELTO, EstadoCasoLF.DESCARTADO}:
            await self._repo.update_estado(caso_id=caso_id, estado="CERRADO", ejecutor_id=actor_id, comentario="Cierre automatico post resolucion", motivo_cierre=(data.motivo_cierre.value if data.motivo_cierre else None), motivo_cierre_id=motivo["id"], observaciones_cierre=data.observaciones_cierre)
        return await self.obtener_detalle(caso_id, actor_id, ["administrador"])

    async def actualizar_caso(self, caso_id: str, usuario_id: str, roles: list[str], data: CasoLfUpdateInput) -> CasoLfDetail:
        actual = await self._repo.get_estado(caso_id)
        if not actual:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        is_admin = "administrador" in roles
        is_owner = str(actual["reportante_id"]) == usuario_id
        # Solo el dueño del hilo o un administrador pueden editar sus datos descriptivos.
        if not is_admin and not is_owner:
            raise HTTPException(status_code=403, detail="No puedes editar este hilo.")
        if not is_admin and str(actual["estado"]) == "CERRADO":
            raise HTTPException(status_code=422, detail="No puedes editar un hilo cerrado.")

        categoria = await self._repo.get_categoria(data.categoria_id)
        if not categoria:
            raise HTTPException(status_code=422, detail="La categoría seleccionada no existe.")
        payload = data.model_dump()
        schema = categoria.get("metadatos_schema")
        payload["metadatos"] = validar_metadatos_caso(payload.get("metadatos"), schema)
        matching_terms = [str(payload["metadatos"][c]) for c in codigos_matching(schema) if payload["metadatos"].get(c)]
        payload["ts_busqueda"] = " ".join(filter(None, [self._build_search(payload), *matching_terms]))
        await self._repo.update_caso_descriptivo(caso_id, payload)
        await self._audit_lf(
            usuario_id,
            "LF_CASO_ACTUALIZADO",
            "caso_lost_found",
            caso_id,
            build_detalle(origen="WEB_OPERATIVA", resultado=AuditResultado.EXITOSO, resumen=f"Datos del hilo {actual['codigo']} actualizados"),
        )
        return await self.obtener_detalle(caso_id, usuario_id, roles)

    async def cerrar_reabrir_caso(self, caso_id: str, actor_id: str, data: CasoCierreInput) -> CasoLfDetail:
        """Cierre/reapertura administrativa: habilita o deshabilita la interacción del hilo."""
        actual = await self._repo.get_estado(caso_id)
        if not actual:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        estado_actual = str(actual["estado"])
        if data.cerrar and estado_actual == "CERRADO":
            raise HTTPException(status_code=422, detail="El hilo ya está cerrado.")
        if not data.cerrar and estado_actual != "CERRADO":
            raise HTTPException(status_code=422, detail="El hilo no está cerrado.")
        nuevo_estado = "CERRADO" if data.cerrar else "ABIERTO"
        await self._repo.update_estado(
            caso_id=caso_id,
            estado=nuevo_estado,
            ejecutor_id=actor_id,
            comentario="Cierre administrativo del hilo" if data.cerrar else "Reapertura administrativa del hilo",
        )
        accion = "LF_CASO_CERRADO" if data.cerrar else "LF_CASO_REABIERTO"
        resumen = f"Hilo {actual['codigo']} {'cerrado' if data.cerrar else 'reabierto'} por administración"
        await self._audit_lf(
            actor_id, accion, "caso_lost_found", caso_id,
            build_detalle(origen="WEB_OPERATIVA", resultado=AuditResultado.EXITOSO, before={"estado": estado_actual}, after={"estado": nuevo_estado}, resumen=resumen),
        )
        return await self.obtener_detalle(caso_id, actor_id, ["administrador"])

    async def ocultar_mostrar_caso(self, caso_id: str, actor_id: str, data: CasoVisibilidadInput) -> CasoLfDetail:
        """Oculta/muestra el hilo para la comunidad (no afecta su estado)."""
        actual = await self._repo.get_estado(caso_id)
        if not actual:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        antes = bool(actual.get("oculto"))
        if antes == data.oculto:
            raise HTTPException(status_code=422, detail="El hilo ya está en ese estado de visibilidad.")
        await self._repo.set_oculto(caso_id, data.oculto)
        accion = "LF_CASO_OCULTADO" if data.oculto else "LF_CASO_MOSTRADO"
        resumen = f"Hilo {actual['codigo']} {'ocultado de' if data.oculto else 'visible para'} la comunidad"
        await self._audit_lf(
            actor_id, accion, "caso_lost_found", caso_id,
            build_detalle(origen="WEB_OPERATIVA", resultado=AuditResultado.EXITOSO, before={"oculto": antes}, after={"oculto": data.oculto}, resumen=resumen),
        )
        return await self.obtener_detalle(caso_id, actor_id, ["administrador"])

    async def cancelar_caso(self, caso_id: str, usuario_id: str, data: CancelarCasoLfInput) -> CasoLfDetail:
        actual = await self._repo.get_estado(caso_id)
        if not actual or str(actual["reportante_id"]) != usuario_id:
            raise HTTPException(status_code=404, detail="Caso propio no encontrado.")
        if actual["estado"] == "CERRADO":
            raise HTTPException(status_code=422, detail="El caso ya esta cerrado.")
        motivo = await self._validar_motivo_cierre("CIERRE_ADMINISTRATIVO", data.observaciones)
        await self._repo.update_estado(caso_id=caso_id, estado="CERRADO", ejecutor_id=usuario_id, comentario=data.observaciones, motivo_cierre="CANCELADO_USUARIO", motivo_cierre_id=motivo["id"], observaciones_cierre=data.observaciones)
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

    async def subir_media_caso(
        self,
        caso_id: str,
        usuario_id: str,
        roles: list[str],
        archivos: list[UploadFile],
    ) -> list[str]:
        """Sube imágenes al storage y devuelve sus URLs SIN mutar el caso.

        Lo usa la edición del hilo para combinar imágenes existentes (URLs ya
        guardadas) con nuevas (archivos) antes de persistir la lista final.
        """
        actual = await self._repo.get_estado(caso_id)
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        if not actual or (str(actual["reportante_id"]) != usuario_id and not is_operativo):
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        if actual["estado"] == "CERRADO":
            raise HTTPException(status_code=422, detail="No se pueden actualizar fotos de un caso cerrado.")
        if not archivos:
            raise HTTPException(status_code=422, detail="Debes adjuntar al menos 1 imagen.")
        return await self._subir_imagenes(f"lost-found/{caso_id}", archivos, max_n=self._MAX_FOTOS_POR_CASO)

    async def _subir_imagenes(self, prefix: str, archivos: list[UploadFile] | None, *, max_n: int = 3) -> list[str]:
        """Valida (MIME/tamaño/cantidad) y sube imágenes; devuelve sus URLs."""
        if not archivos:
            return []
        if len(archivos) > max_n:
            raise HTTPException(status_code=422, detail=f"Solo puedes adjuntar hasta {max_n} imagenes.")
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
            url = await storage.upload(
                bucket=settings.SUPABASE_STORAGE_BUCKET,
                path=f"{prefix}/{uuid4().hex}_{nombre_seguro}",
                content=contenido,
                content_type=mime,
            )
            urls.append(url)
        return urls

    async def _obtener_lista_negra(self) -> list[str]:
        value = await self._repo.get_config_value(COMENTARIOS_LISTA_NEGRA_KEY) or {}
        palabras = value.get("palabras") if isinstance(value, dict) else None
        if not isinstance(palabras, list):
            palabras = LISTA_NEGRA_DEFAULT
        return [self._normalizar_texto(str(p)) for p in palabras if str(p).strip()]

    async def _obtener_profundidad_maxima(self) -> int:
        value = await self._repo.get_config_value(COMENTARIOS_PROFUNDIDAD_KEY) or {}
        try:
            valor = int(value.get("valor", COMENTARIOS_PROFUNDIDAD_DEFAULT))
        except (TypeError, ValueError):
            valor = COMENTARIOS_PROFUNDIDAD_DEFAULT
        return max(1, min(valor, COMENTARIOS_PROFUNDIDAD_MAX))

    async def _validar_contenido(self, texto: str) -> None:
        """Rechaza el comentario si contiene alguna palabra de la lista negra."""
        normalizado = self._normalizar_texto(texto)
        palabras_texto = set(re.findall(r"[a-z0-9]+", normalizado))
        for prohibida in await self._obtener_lista_negra():
            if " " in prohibida or "-" in prohibida:
                if prohibida in normalizado:
                    raise HTTPException(status_code=422, detail="El comentario contiene lenguaje no permitido.")
            elif prohibida in palabras_texto:
                raise HTTPException(status_code=422, detail="El comentario contiene lenguaje no permitido.")

    @staticmethod
    def _normalizar_texto(value: str) -> str:
        base = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
        return base.lower().strip()

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
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        caso = await self._repo.get_estado(caso_id)
        is_owner = bool(caso and str(caso["reportante_id"]) == usuario_id)
        caso_tipo = str(caso["tipo"]) if caso else None
        rows = await self._repo.list_comentarios(caso_id, include_hidden=is_operativo, usuario_id=usuario_id)
        rows = self._compute_profundidades(rows)
        rows = self._mark_comment_flags(rows, usuario_id, is_operativo, is_owner=is_owner, caso_tipo=caso_tipo)
        return [self._map_comment(row, mostrar_eliminado=is_operativo) for row in rows]

    async def crear_comentario(self, caso_id: str, usuario_id: str, data: ComentarioLfCreateInput, archivos: list[UploadFile] | None = None) -> ComentarioLfItem:
        actual = await self._repo.get_estado(caso_id)
        if not actual or str(actual["estado"]) not in CHAT_STATES:
            raise HTTPException(status_code=404, detail="Caso activo no encontrado.")
        contenido = data.contenido.strip()
        await self._validar_contenido(contenido)
        tag = data.tag or None
        if not lf_tag_valido(str(actual["tipo"]), tag):
            raise HTTPException(status_code=422, detail="La etiqueta no es válida para este tipo de caso.")
        if data.parent_id:
            parent = await self._repo.get_comentario_meta(data.parent_id)
            if not parent or str(parent["caso_id"]) != caso_id or not parent["visible"]:
                raise HTTPException(status_code=422, detail="Comentario padre invalido.")
            max_profundidad = await self._obtener_profundidad_maxima()
            profundidad_padre = await self._repo.get_comentario_profundidad(data.parent_id)
            if profundidad_padre + 1 >= max_profundidad:
                raise HTTPException(status_code=422, detail=f"Se alcanzó la profundidad máxima de respuestas ({max_profundidad}).")
        elif await self._repo.count_root_comentarios(caso_id) >= 200:
            raise HTTPException(status_code=422, detail="El hilo alcanzo el limite de comentarios principales.")
        imagenes = await self._subir_imagenes(f"lost-found/{caso_id}/comentarios", archivos)
        row = await self._repo.create_comentario(caso_id, usuario_id, contenido, data.parent_id, imagenes, tag)
        await self._audit_lf(usuario_id, "LF_COMENTARIO_CREADO", "comentario_caso_lf", str(row["id"]), {"caso_id": caso_id, "imagenes": len(imagenes), "tag": tag})
        participantes = await self._repo.list_participantes(caso_id)
        for p in participantes:
            destinatario = str(p["usuario_id"])
            if destinatario != usuario_id:
                await self._notify.create_inapp(destinatario_id=destinatario, tipo_evento="LF_COMENTARIO_NUEVO", asunto=f"Nuevo comentario en {actual['codigo']}", contenido=f"Hay actividad en el caso {actual['codigo']}.")
        # NOTA: las etiquetas de prioridad alta (POSIBLE_HALLAZGO / RECLAMO) deben
        # notificar por correo al reportante. Punto de integración pendiente.
        row["tag_prioridad"] = lf_tag_priority(str(actual["tipo"]), tag)
        return self._map_comment(row, mostrar_eliminado=True)

    async def editar_comentario(self, comentario_id: str, actor_id: str, roles: list[str], data: ComentarioLfEditInput) -> None:
        if not bool(OPERATIVO_ROLES.intersection(roles)):
            raise HTTPException(status_code=403, detail="No tienes permisos para editar comentarios.")
        comentario = await self._repo.get_comentario_meta(comentario_id)
        if not comentario:
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        contenido = data.contenido.strip()
        await self._validar_contenido(contenido)
        if not await self._repo.update_comentario_contenido(comentario_id, contenido):
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        await self._audit_lf(actor_id, "LF_COMENTARIO_EDITADO", "comentario_caso_lf", comentario_id, {"caso_id": str(comentario["caso_id"])})

    async def eliminar_comentario_admin(self, comentario_id: str, actor_id: str, roles: list[str]) -> None:
        if not bool(OPERATIVO_ROLES.intersection(roles)):
            raise HTTPException(status_code=403, detail="No tienes permisos para eliminar comentarios.")
        comentario = await self._repo.get_comentario_meta(comentario_id)
        if not comentario:
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        if not await self._repo.soft_delete_comentario(comentario_id, actor_id, "Eliminado por gestión"):
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        await self._audit_lf(actor_id, "LF_COMENTARIO_ELIMINADO_ADMIN", "comentario_caso_lf", comentario_id, {"caso_id": str(comentario["caso_id"])})

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

    async def reaccionar_comentario(self, comentario_id: str, usuario_id: str) -> ComentarioReaccionResult:
        """Alterna la reacción "Destacar" del usuario sobre un comentario."""
        comentario = await self._repo.get_comentario_meta(comentario_id)
        if not comentario or not comentario["visible"]:
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        if str(comentario["autor_id"]) == usuario_id:
            raise HTTPException(status_code=422, detail="No puedes destacar tu propio comentario.")
        destacados, reaccionado = await self._repo.toggle_reaccion(comentario_id, usuario_id)
        return ComentarioReaccionResult(destacados=destacados, reaccionado=reaccionado)

    async def fijar_comentario(self, comentario_id: str, usuario_id: str, roles: list[str], data: ComentarioFijarInput) -> None:
        """Fija/desfija un comentario principal. Permitido a operativo/admin o al dueño del hilo."""
        comentario = await self._repo.get_comentario_meta(comentario_id)
        if not comentario:
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        if comentario.get("parent_id"):
            raise HTTPException(status_code=422, detail="Solo se pueden fijar comentarios principales.")
        caso = await self._repo.get_estado(str(comentario["caso_id"]))
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        is_operativo = bool(OPERATIVO_ROLES.intersection(roles))
        is_owner = str(caso["reportante_id"]) == usuario_id
        if not is_operativo and not is_owner:
            raise HTTPException(status_code=403, detail="No tienes permisos para fijar comentarios.")
        if not await self._repo.set_fijado(comentario_id, data.fijar, usuario_id):
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        await self._audit_lf(usuario_id, "LF_COMENTARIO_FIJADO", "comentario_caso_lf", comentario_id, {"fijar": data.fijar, "caso_id": str(comentario["caso_id"])})

    async def listar_supervisores_acceso(self) -> list[SupervisorLfItem]:
        rows = await self._repo.listar_supervisores_acceso()
        return [
            SupervisorLfItem(
                id=str(r["id"]),
                nombre_completo=f"{r.get('nombre') or ''} {r.get('apellido') or ''}".strip() or "Usuario",
                email=r.get("email"),
                rol="supervisor",
                asignado=bool(r.get("asignado")),
            )
            for r in rows
        ]

    async def set_acceso_supervisores(self, usuario_ids: list[str], actor_id: str) -> list[SupervisorLfItem]:
        await self._repo.set_acceso_supervisores(usuario_ids, actor_id)
        await self._audit_lf(actor_id, "LF_ACCESO_SUPERVISORES_ACTUALIZADO", "acceso_modulo_lf", None, {"usuario_ids": usuario_ids})
        return await self.listar_supervisores_acceso()

    async def tiene_acceso_lf(self, usuario_id: str, roles: list[str]) -> bool:
        # Administradores y operadores conservan el acceso operativo del módulo.
        # La restricción aplica a los supervisores: solo los asignados pueden entrar.
        if "administrador" in roles or "operador" in roles:
            return True
        return await self._repo.tiene_acceso_lf(usuario_id)

    async def obtener_acceso_mi(self, usuario_id: str, roles: list[str]) -> AccesoLfMiResult:
        return AccesoLfMiResult(acceso=await self.tiene_acceso_lf(usuario_id, roles))

    async def obtener_politica_custodia(self) -> CustodiaPoliticaItem:
        """Lee la política de custodia. Si no existe, devuelve los valores por defecto."""
        value = await self._repo.get_config_value(CUSTODIA_POLITICA_KEY) or {}
        merged = {**CUSTODIA_POLITICA_DEFAULT, **value}
        return CustodiaPoliticaItem(**{k: merged[k] for k in CustodiaPoliticaItem.model_fields})

    async def actualizar_politica_custodia(self, actor_id: str, data: CustodiaPoliticaUpdateInput) -> CustodiaPoliticaItem:
        before = await self.obtener_politica_custodia()
        value = {**data.model_dump(), "version": CUSTODIA_POLITICA_VERSION}
        await self._repo.update_config(
            CUSTODIA_POLITICA_KEY,
            value,
            "Política de custodia: plazos de vencimiento y recordatorios (objetos normales y perecibles).",
            actor_id,
        )
        detalle = build_detalle(
            origen="WEB_OPERATIVA",
            resultado=AuditResultado.EXITOSO,
            before=before.model_dump(exclude={"version"}),
            after=data.model_dump(),
            resumen="Se actualizó la política de custodia y recordatorios",
        )
        await self._audit_lf(actor_id, "LF_POLITICA_CUSTODIA_ACTUALIZADA", "configuracion_lf", None, detalle)
        return CustodiaPoliticaItem(**value)

    async def evaluar_recordatorios_custodia(self, now: datetime | None = None) -> list[dict[str, Any]]:
        """Evalúa vencimientos y registra (de forma idempotente) los recordatorios pendientes.

        Función reutilizable y SIN ejecución automática: el proyecto no cuenta con
        scheduler/cron. PUNTO DE INTEGRACIÓN PENDIENTE: una tarea programada debe
        invocar este método periódicamente y luego entregar cada recordatorio
        devuelto a través del sistema de notificaciones (`NotificacionRepository`).

        Reglas aplicadas:
          - Sólo custodias ACTIVA cuyo caso no esté DEVUELTO/DESCARTADO/CERRADO.
          - "Por vencer" es una condición calculada desde `fecha_vencimiento` (no un estado).
          - El UNIQUE (custodia, tipo, fecha_referencia) evita recordatorios repetidos.
          - No recalcula custodias históricas: usa la `fecha_vencimiento` ya persistida.
        """
        now = now or datetime.now(timezone.utc)
        politica = await self.obtener_politica_custodia()
        candidatas = await self._repo.custodias_para_recordatorio(list(CASO_ESTADOS_SIN_RECORDATORIO))
        nuevos: list[dict[str, Any]] = []
        for c in candidatas:
            venc = c["fecha_vencimiento"]
            es_perecible = bool(c["es_perecible"])
            if es_perecible:
                alerta = venc - timedelta(hours=politica.horas_alerta_perecible)
                if now >= venc:
                    tipo = "VENCIDO"
                elif now >= alerta:
                    tipo = "PERECIBLE_PROXIMO_VENCIMIENTO"
                else:
                    continue
            else:
                alerta = venc - timedelta(days=politica.dias_recordatorio_previo)
                if now >= venc:
                    tipo = "VENCIDO"
                elif now >= alerta:
                    tipo = "PROXIMO_VENCIMIENTO"
                else:
                    continue
            creado = await self._repo.registrar_recordatorio(str(c["id"]), tipo, venc)
            if creado:
                nuevos.append({"custodia_id": str(c["id"]), "caso_codigo": c.get("caso_codigo"), "tipo": tipo, "fecha_referencia": venc})
        return nuevos

    async def crear_custodia(self, caso_id: str, actor_id: str, data: CustodiaLfCreateInput) -> CustodiaLfItem:
        caso = await self._repo.get_detail_by_ref(caso_id)
        if not caso:
            raise HTTPException(status_code=404, detail="Caso no encontrado.")
        # La fecha de vencimiento se calcula desde la política vigente y el snapshot es_perecible.
        politica = await self.obtener_politica_custodia()
        es_perecible = bool(data.es_perecible)
        ahora = datetime.now(timezone.utc)
        vencimiento = ahora + (
            timedelta(hours=politica.horas_maximas_perecibles)
            if es_perecible
            else timedelta(days=politica.dias_maximos_custodia)
        )
        row = await self._repo.create_custodia(caso_id, actor_id, {
            "ubicacion_custodia": data.ubicacion_custodia,
            "observaciones": data.observaciones,
            "es_perecible": es_perecible,
            "fecha_vencimiento": vencimiento,
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
        politica = await self.obtener_politica_custodia()
        await self._repo.refresh_custodia_estados(
            dias_alerta_vencimiento=politica.dias_alerta_vencimiento,
            horas_alerta_perecible=politica.horas_alerta_perecible,
        )
        rows, total = await self._repo.list_custodias(
            estados=estados,
            search=search,
            vencimientos=vencimientos,
            dias_alerta_vencimiento=politica.dias_alerta_vencimiento,
            horas_alerta_perecible=politica.horas_alerta_perecible,
            page=safe_page,
            per_page=safe_per_page,
        )
        return {
            "items": [CustodiaLfItem(**row) for row in rows],
            "total": total,
            "page": safe_page,
            "per_page": safe_per_page,
        }

    async def actualizar_custodia(self, custodia_id: str, actor_id: str, data: CustodiaLfUpdateInput) -> CustodiaLfItem:
        custodia = await self._repo.get_custodia(custodia_id)
        if not custodia:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        before = {
            "estado": str(custodia.estado),
            "ubicacion_custodia": custodia.ubicacion_custodia,
            "observaciones": custodia.observaciones,
            "fecha_vencimiento": custodia.fecha_vencimiento.isoformat(),
        }
        values = data.model_dump(exclude_unset=True)
        if str(custodia.estado) in {"ACTIVA", "PROXIMA_VENCER", "VENCIDA"}:
            politica = await self.obtener_politica_custodia()
            vencimiento = values.get("fecha_vencimiento", custodia.fecha_vencimiento)
            values["estado"] = self._estado_custodia_por_vencimiento(
                vencimiento,
                bool(custodia.es_perecible),
                politica,
            )
        row = await self._repo.update_custodia(custodia_id, values)
        if not row:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        after = {
            "estado": row["estado"],
            "ubicacion_custodia": row["ubicacion_custodia"],
            "observaciones": row["observaciones"],
            "fecha_vencimiento": row["fecha_vencimiento"].isoformat(),
        }
        changed = {key for key, value in after.items() if before.get(key) != value}
        if changed:
            fecha_cambio = "fecha_vencimiento" in changed
            estado_cambio = "estado" in changed
            resumen = "Custodia actualizada"
            if fecha_cambio and estado_cambio:
                resumen = f"Fecha de vencimiento actualizada; estado recalculado a {after['estado']}"
            elif fecha_cambio:
                resumen = "Fecha de vencimiento de custodia actualizada"
            elif estado_cambio:
                resumen = f"Estado de custodia recalculado a {after['estado']}"
            detalle = build_detalle(
                origen="WEB_OPERATIVA",
                resultado=AuditResultado.EXITOSO,
                before=before,
                after=after,
                resumen=resumen,
                campos_modificados=sorted(changed),
                caso_id=str(custodia.caso_id),
            )
            await self._audit_lf(
                actor_id,
                AuditAccion.ACTUALIZAR_CUSTODIA,
                AuditEntidad.CUSTODIA_OBJETO,
                custodia_id,
                detalle,
            )
            comentario = resumen
            if fecha_cambio:
                comentario = (
                    f"{resumen}. Vencimiento anterior: {before['fecha_vencimiento']}; "
                    f"nuevo: {after['fecha_vencimiento']}."
                )
            caso_estado = await self._repo.get_estado(str(custodia.caso_id))
            estado_caso = str(caso_estado["estado"]) if caso_estado else "EN_CUSTODIA"
            await self._repo.add_historial(
                str(custodia.caso_id),
                estado_caso,
                estado_caso,
                "Actualización de custodia",
                actor_id,
                comentario,
            )
        return CustodiaLfItem(**row)

    async def registrar_devolucion(self, custodia_id: str, actor_id: str, data: DevolucionLfInput) -> None:
        custodia = await self._repo.get_custodia(custodia_id)
        if not custodia:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        await self._repo.update_custodia(custodia_id, {"estado": "DEVUELTA", "reclamante_id": data.reclamante_id, "entregado_por_id": UUID(actor_id), "metodo_verificacion": data.metodo_verificacion, "observaciones": data.observaciones, "fecha_devolucion": datetime.now(timezone.utc)})
        motivo = await self._validar_motivo_cierre("DEVUELTO_AL_PROPIETARIO", data.observaciones, validacion_entrega=bool(data.metodo_verificacion))
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="DEVUELTO", ejecutor_id=actor_id, comentario=data.observaciones, motivo_cierre="DEVUELTO", motivo_cierre_id=motivo["id"], observaciones_cierre=data.observaciones)
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="CERRADO", ejecutor_id=actor_id, comentario="Cierre automatico por devolucion", motivo_cierre="DEVUELTO", motivo_cierre_id=motivo["id"], observaciones_cierre=data.observaciones)
        await self._audit_lf(actor_id, "LF_DEVOLUCION_REALIZADA", "custodia_objeto", custodia_id, {"reclamante_id": str(data.reclamante_id), "metodo_verificacion": data.metodo_verificacion})

    async def registrar_descarte(self, custodia_id: str, actor_id: str, data: DescarteLfInput) -> None:
        custodia = await self._repo.get_custodia(custodia_id)
        if not custodia:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        motivo_ref = "OBJETO_DESCARTADO" if data.motivo_cierre_id == "OTRO" else data.motivo_cierre_id
        observacion = data.observaciones or data.motivo_otro
        motivo = await self._validar_motivo_cierre(motivo_ref, observacion, clase_cierre="DESCARTE")
        motivo_descarte = data.motivo_otro or motivo["nombre"]
        await self._repo.update_custodia(custodia_id, {
            "estado": "DESCARTADA",
            "destino_descarte": data.destino_descarte,
            "motivo_descarte": motivo_descarte,
            "observaciones": data.observaciones,
            "fecha_descarte": datetime.now(timezone.utc),
        })
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="DESCARTADO", ejecutor_id=actor_id, comentario=observacion, motivo_cierre="DESCARTADO", motivo_cierre_id=motivo["id"], observaciones_cierre=observacion)
        await self._repo.update_estado(caso_id=str(custodia.caso_id), estado="CERRADO", ejecutor_id=actor_id, comentario="Cierre automatico por descarte", motivo_cierre="DESCARTADO", motivo_cierre_id=motivo["id"], observaciones_cierre=observacion)
        await self._audit_lf(actor_id, "LF_DESCARTE_EJECUTADO", "custodia_objeto", custodia_id, {"motivo": motivo_descarte, "motivo_cierre_id": motivo["id"], "destino": data.destino_descarte})

    async def revertir_devolucion(self, custodia_id: str, actor_id: str) -> CustodiaLfItem:
        """Revierte una devolución: deja la custodia operativa y reabre el caso.

        Pensado como apoyo cuando una devolución se registró por error o el caso
        debe reabrirse. Limpia los datos de la entrega y conserva la trazabilidad.
        """
        custodia = await self._repo.get_custodia(custodia_id)
        if not custodia:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        if str(custodia.estado) != "DEVUELTA":
            raise HTTPException(status_code=422, detail="Solo se puede revertir una custodia en estado devuelta.")
        row = await self._reactivar_custodia_operativa(
            custodia,
            actor_id,
            limpiar={
                "reclamante_id": None,
                "entregado_por_id": None,
                "metodo_verificacion": None,
                "fecha_devolucion": None,
            },
            audit_accion="LF_DEVOLUCION_REVERTIDA",
            comentario_caso="Devolución revertida: la custodia vuelve a estar operativa.",
        )
        return CustodiaLfItem(**row)

    async def reactivar_descarte(self, custodia_id: str, actor_id: str) -> CustodiaLfItem:
        """Reactiva una custodia descartada y reabre el caso.

        El estado operativo se recalcula según la fecha de vencimiento
        (ACTIVA / PROXIMA_VENCER / VENCIDA). Limpia los datos del descarte.
        """
        custodia = await self._repo.get_custodia(custodia_id)
        if not custodia:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        if str(custodia.estado) != "DESCARTADA":
            raise HTTPException(status_code=422, detail="Solo se puede reactivar una custodia en estado descartada.")
        row = await self._reactivar_custodia_operativa(
            custodia,
            actor_id,
            limpiar={
                "destino_descarte": None,
                "motivo_descarte": None,
                "fecha_descarte": None,
            },
            audit_accion="LF_DESCARTE_REACTIVADO",
            comentario_caso="Descarte reactivado: la custodia vuelve a estar operativa.",
        )
        return CustodiaLfItem(**row)

    async def _reactivar_custodia_operativa(
        self,
        custodia: Any,
        actor_id: str,
        *,
        limpiar: dict[str, Any],
        audit_accion: str,
        comentario_caso: str,
    ) -> dict[str, Any]:
        """Devuelve la custodia a un estado operativo y reabre el caso asociado."""
        politica = await self.obtener_politica_custodia()
        estado_objetivo = self._estado_custodia_por_vencimiento(
            custodia.fecha_vencimiento,
            bool(custodia.es_perecible),
            politica,
        )
        estado_anterior = str(custodia.estado)
        row = await self._repo.update_custodia(str(custodia.id), {"estado": estado_objetivo, **limpiar})
        if not row:
            raise HTTPException(status_code=404, detail="Custodia no encontrada.")
        await self._repo.reabrir_caso(
            caso_id=str(custodia.caso_id),
            ejecutor_id=actor_id,
            estado="EN_CUSTODIA",
            comentario=comentario_caso,
        )
        await self._audit_lf(
            actor_id,
            audit_accion,
            "custodia_objeto",
            str(custodia.id),
            {
                "caso_id": str(custodia.caso_id),
                "estado_anterior": estado_anterior,
                "estado_nuevo": estado_objetivo,
            },
        )
        return row

    async def obtener_kpis(self) -> KpisLfResponse:
        return KpisLfResponse(**await self._repo.get_kpis())

    async def obtener_dashboard(
        self,
        *,
        fecha_desde: datetime,
        fecha_hasta: datetime,
        categorias: list[str] | None,
        estados: list[str] | None,
        tipo: str | None,
    ) -> DashboardLfResponse:
        current = await self._repo.get_dashboard_rows(
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            categorias=categorias,
            estados=estados,
            tipo=tipo,
        )
        duration = fecha_hasta - fecha_desde
        previous = await self._repo.get_dashboard_rows(
            fecha_desde=fecha_desde - duration,
            fecha_hasta=fecha_desde,
            categorias=categorias,
            estados=estados,
            tipo=tipo,
        )
        politica = await self.obtener_politica_custodia()
        return DashboardLfResponse(**self._build_dashboard(current, previous, fecha_desde, fecha_hasta, politica))

    @staticmethod
    def _build_dashboard(
        current: dict[str, list[dict[str, Any]]],
        previous: dict[str, list[dict[str, Any]]],
        fecha_desde: datetime,
        fecha_hasta: datetime,
        politica: CustodiaPoliticaItem,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        casos = current["casos"]
        custodias = current["custodias"]
        previous_cases = previous["casos"]
        previous_custodias = previous["custodias"]

        active_states = {"ABIERTO", "EN_REVISION", "CONFIRMADO", "EN_CUSTODIA"}
        total = len(casos)
        activos = sum(1 for item in casos if str(item["estado"]) in active_states)
        en_custodia = sum(1 for item in casos if str(item["estado"]) == "EN_CUSTODIA")
        devueltos = sum(1 for item in casos if str(item["estado"]) == "DEVUELTO")
        alert_cutoff = now + timedelta(days=politica.dias_alerta_vencimiento)
        critical = [
            item for item in custodias
            if str(item["estado"]) in {"ACTIVA", "PROXIMA_VENCER", "VENCIDA"}
            and item["fecha_vencimiento"] <= alert_cutoff
        ]
        return_durations = [
            ((item["fecha_devolucion"] or item["updated_at"]) - item["fecha_recepcion"]).total_seconds() / 86400
            for item in custodias
            if str(item["estado"]) == "DEVUELTA"
        ]
        avg_return = round(sum(return_durations) / len(return_durations), 1) if return_durations else 0

        previous_total = len(previous_cases)
        previous_active = sum(1 for item in previous_cases if str(item["estado"]) in active_states)
        previous_custody = sum(1 for item in previous_cases if str(item["estado"]) == "EN_CUSTODIA")
        previous_returned = sum(1 for item in previous_cases if str(item["estado"]) == "DEVUELTO")
        previous_critical = sum(
            1 for item in previous_custodias
            if str(item["estado"]) in {"ACTIVA", "PROXIMA_VENCER", "VENCIDA"}
            and item["fecha_vencimiento"] <= alert_cutoff
        )
        previous_return_durations = [
            ((item["fecha_devolucion"] or item["updated_at"]) - item["fecha_recepcion"]).total_seconds() / 86400
            for item in previous_custodias
            if str(item["estado"]) == "DEVUELTA"
        ]
        previous_avg_return = (
            sum(previous_return_durations) / len(previous_return_durations)
            if previous_return_durations else 0
        )

        recovery = round((devueltos / total) * 100, 1) if total else 0
        previous_recovery = round((previous_returned / previous_total) * 100, 1) if previous_total else 0

        category_counts: dict[str, int] = {}
        state_counts: dict[str, int] = {}
        type_counts: dict[str, int] = {}
        for item in casos:
            category = item.get("categoria") or "Sin categoría"
            category_counts[category] = category_counts.get(category, 0) + 1
            state = str(item["estado"])
            state_counts[state] = state_counts.get(state, 0) + 1
            case_type = str(item["tipo"])
            type_counts[case_type] = type_counts.get(case_type, 0) + 1

        custody_by_category: dict[str, list[float]] = {}
        for item in custodias:
            end = item["fecha_devolucion"] or (item["updated_at"] if str(item["estado"]) in {"DEVUELTA", "DESCARTADA"} else now)
            days = max(0.0, (end - item["fecha_recepcion"]).total_seconds() / 86400)
            custody_by_category.setdefault(item.get("categoria") or "Sin categoría", []).append(days)
        custody_ranked = sorted(
            ((category, sum(values) / len(values), len(values)) for category, values in custody_by_category.items()),
            key=lambda item: item[1],
            reverse=True,
        )
        custody_chart = [
            {"categoria": category, "dias_promedio": round(avg, 1)}
            for category, avg, _count in custody_ranked[:5]
        ]
        others = custody_ranked[5:]
        if others:
            total_weight = sum(count for _category, _avg, count in others)
            custody_chart.append({
                "categoria": "Otros",
                "dias_promedio": round(sum(avg * count for _category, avg, count in others) / total_weight, 1),
            })

        age_ranges = [
            ("0 – 7 días", 0, 7),
            ("8 – 15 días", 8, 15),
            ("16 – 30 días", 16, 30),
            ("+ 30 días", 31, None),
        ]
        ages = []
        for label, minimum, maximum in age_ranges:
            count = 0
            for item in casos:
                if str(item["estado"]) not in active_states:
                    continue
                days = max(0, (now - item["created_at"]).days)
                if days >= minimum and (maximum is None or days <= maximum):
                    count += 1
            ages.append({"rango": label, "total": count})

        return {
            "casos_totales": LostFoundService._dashboard_kpi(total, previous_total),
            "casos_activos": LostFoundService._dashboard_kpi(activos, previous_active),
            "en_custodia": LostFoundService._dashboard_kpi(en_custodia, previous_custody),
            "por_vencer": LostFoundService._dashboard_kpi(len(critical), previous_critical, "Próximos días"),
            "tasa_recuperacion": LostFoundService._dashboard_kpi(recovery, previous_recovery, f"{devueltos} casos devueltos"),
            "tiempo_promedio_devolucion": LostFoundService._dashboard_kpi(avg_return, previous_avg_return, "días"),
            "serie": LostFoundService._dashboard_series(casos, custodias, fecha_desde, fecha_hasta),
            "por_categoria": [
                {"clave": key, "etiqueta": key, "total": value}
                for key, value in sorted(category_counts.items(), key=lambda item: item[1], reverse=True)
            ],
            "por_estado": [
                {"clave": key, "etiqueta": key, "total": value}
                for key, value in sorted(state_counts.items(), key=lambda item: item[1], reverse=True)
            ],
            "por_tipo": [
                {
                    "clave": key,
                    "etiqueta": "Encontrado" if key == "ENCONTRADO" else "Perdido",
                    "total": value,
                }
                for key, value in sorted(type_counts.items(), key=lambda item: item[1], reverse=True)
            ],
            "custodia_por_categoria": custody_chart,
            "antiguedad": ages,
            "custodias_criticas": [
                {
                    "id": str(item["id"]),
                    "caso_id": str(item["caso_id"]),
                    "codigo": item["codigo"],
                    "titulo": item["titulo"],
                    "categoria": item.get("categoria"),
                    "fecha_vencimiento": item["fecha_vencimiento"],
                    "dias_restantes": (item["fecha_vencimiento"] - now).days,
                }
                for item in sorted(critical, key=lambda row: row["fecha_vencimiento"])[:3]
            ],
            "actividad_reciente": [
                {
                    "id": str(item["id"]),
                    "codigo": item["codigo"],
                    "titulo": item["titulo"],
                    "tipo": str(item["tipo"]),
                    "estado": str(item["estado"]),
                    "categoria": item.get("categoria"),
                    "dias_en_custodia": LostFoundService._case_custody_days(item["id"], custodias, now),
                    "matching_total": int(item.get("matching_total") or 0),
                    "matching_confirmado": int(item.get("matching_confirmados") or 0) > 0,
                    "reportante": f"{item.get('reportante_nombre') or ''} {item.get('reportante_apellido') or ''}".strip() or "Usuario",
                    "created_at": item["created_at"],
                }
                for item in casos[:5]
            ],
        }

    @staticmethod
    def _dashboard_kpi(value: float, previous: float, detail: str | None = None) -> dict[str, Any]:
        variation = None
        if previous:
            variation = round(((value - previous) / previous) * 100, 1)
        elif value:
            variation = 100.0
        return {"valor": value, "variacion": variation, "detalle": detail}

    @staticmethod
    def _dashboard_series(
        casos: list[dict[str, Any]],
        custodias: list[dict[str, Any]],
        fecha_desde: datetime,
        fecha_hasta: datetime,
    ) -> list[dict[str, Any]]:
        total_days = max(1, (fecha_hasta - fecha_desde).days)
        bucket_days = max(1, (total_days + 11) // 12)
        items: list[dict[str, Any]] = []
        cursor = fecha_desde
        while cursor < fecha_hasta:
            end = min(cursor + timedelta(days=bucket_days), fecha_hasta)
            items.append({
                "fecha": cursor.date().isoformat(),
                "registrados": sum(1 for item in casos if cursor <= item["created_at"] < end),
                "devueltos": sum(
                    1 for item in custodias
                    if str(item["estado"]) == "DEVUELTA"
                    and cursor <= (item["fecha_devolucion"] or item["updated_at"]) < end
                ),
            })
            cursor = end
        return items

    @staticmethod
    def _case_custody_days(case_id: Any, custodias: list[dict[str, Any]], now: datetime) -> int | None:
        custody = next((item for item in custodias if item["caso_id"] == case_id), None)
        if not custody:
            return None
        end = custody["fecha_devolucion"] or (
            custody["updated_at"] if str(custody["estado"]) in {"DEVUELTA", "DESCARTADA"} else now
        )
        return max(0, (end - custody["fecha_recepcion"]).days)

    async def listar_configuracion(self) -> list[ConfiguracionLfItem]:
        return [ConfiguracionLfItem(**row) for row in await self._repo.get_config()]

    async def actualizar_configuracion(self, key: str, actor_id: str, data: ConfiguracionLfUpdateInput) -> ConfiguracionLfItem:
        row = await self._repo.update_config(key, data.value, data.descripcion, actor_id)
        await self._audit_lf(actor_id, "LF_CONFIG_MODIFICADA", "configuracion_lf", None, {"parametro": key, "valor_nuevo": data.value})
        return ConfiguracionLfItem(**row)

    async def obtener_config_matching(self) -> MatchingConfigItem:
        """Lee el umbral de sugerencia. Si no existe, devuelve el valor por defecto."""
        value = await self._repo.get_config_value(MATCHING_CONFIG_KEY) or {}
        umbral = value.get("umbral", MATCHING_UMBRAL_DEFAULT)
        try:
            umbral = float(umbral)
        except (TypeError, ValueError):
            umbral = MATCHING_UMBRAL_DEFAULT
        umbral = min(1.0, max(0.0, umbral))
        return MatchingConfigItem(umbral=umbral, version=int(value.get("version", MATCHING_CONFIG_VERSION)))

    async def actualizar_config_matching(self, actor_id: str, data: MatchingConfigUpdateInput) -> MatchingConfigItem:
        before = await self.obtener_config_matching()
        nuevo_umbral = round(float(data.umbral), 4)
        value = {"umbral": nuevo_umbral, "version": MATCHING_CONFIG_VERSION}
        await self._repo.update_config(
            MATCHING_CONFIG_KEY,
            value,
            "Umbral de sugerencia del motor de matching determinístico (0.00 a 1.00).",
            actor_id,
        )
        detalle = build_detalle(
            origen="WEB_OPERATIVA",
            resultado=AuditResultado.EXITOSO,
            before={"umbral": before.umbral},
            after={"umbral": nuevo_umbral},
            resumen="Se actualizó el umbral de sugerencia de matching",
        )
        await self._audit_lf(actor_id, "LF_UMBRAL_MATCHING_ACTUALIZADO", "configuracion_lf", None, detalle)
        return MatchingConfigItem(umbral=nuevo_umbral, version=MATCHING_CONFIG_VERSION)

    async def _generar_matches(self, caso_id: str, actor_id: str) -> int:
        caso = await self._repo.get_detail_by_ref(caso_id)
        if not caso:
            return 0
        config = await self.obtener_config_matching()
        umbral = config.umbral
        categoria = await self._repo.get_categoria(str(caso["categoria_id"])) if caso.get("categoria_id") else None
        matching_codes = codigos_matching(categoria.get("metadatos_schema") if categoria else None)
        created = 0
        for candidate in await self._repo.find_match_candidates(caso):
            score, detalle = self._score(caso, candidate, matching_codes)
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
    def _score(caso: dict[str, Any], candidate: dict[str, Any], matching_codes: list[str] | None = None) -> tuple[float, dict[str, Any]]:
        categoria = 1.0 if caso.get("categoria_id") and caso.get("categoria_id") == candidate.get("categoria_id") else 0.0
        # Sólo los metadatos textuales elegibles (participa_en_matching) entran al texto comparado.
        meta_a = " ".join(str((caso.get("metadatos") or {}).get(c) or "") for c in (matching_codes or []))
        meta_b = " ".join(str((candidate.get("metadatos") or {}).get(c) or "") for c in (matching_codes or []))
        text_a = " ".join(str(caso.get(k) or "") for k in ("titulo", "descripcion", "marca", "color_principal")) + " " + meta_a
        text_b = " ".join(str(candidate.get(k) or "") for k in ("titulo", "descripcion", "marca", "color_principal")) + " " + meta_b
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

    async def _validar_motivo_cierre(
        self,
        motivo_ref: str | None,
        observaciones: str | None,
        *,
        validacion_entrega: bool = False,
        clase_cierre: str | None = None,
    ) -> dict[str, Any]:
        if not motivo_ref:
            raise HTTPException(status_code=422, detail="Debe seleccionar un motivo de cierre activo.")
        motivo = await self._repo.get_motivo_cierre(motivo_ref)
        if not motivo or not motivo["activo"]:
            raise HTTPException(status_code=422, detail="El motivo de cierre no existe o esta inactivo.")
        if motivo["requiere_observacion"] and not (observaciones or "").strip():
            raise HTTPException(status_code=422, detail="Las observaciones de cierre son obligatorias para este motivo.")
        if clase_cierre and motivo["clase_cierre"] != clase_cierre:
            raise HTTPException(status_code=422, detail=f"El motivo seleccionado no corresponde a un cierre de tipo {clase_cierre}.")
        if motivo["clase_cierre"] == "DEVOLUCION" and motivo["requiere_validacion_entrega"] and not validacion_entrega:
            raise HTTPException(status_code=422, detail="Este motivo requiere la verificacion de entrega del flujo de devolucion.")
        return motivo

    @staticmethod
    def _estado_custodia_por_vencimiento(
        fecha_vencimiento: datetime,
        es_perecible: bool,
        politica: CustodiaPoliticaItem,
        now: datetime | None = None,
    ) -> str:
        now = now or datetime.now(timezone.utc)
        if fecha_vencimiento <= now:
            return "VENCIDA"
        alerta = (
            fecha_vencimiento - timedelta(hours=politica.horas_alerta_perecible)
            if es_perecible
            else fecha_vencimiento - timedelta(days=politica.dias_alerta_vencimiento)
        )
        return "PROXIMA_VENCER" if now >= alerta else "ACTIVA"

    @staticmethod
    def _build_search(data: dict[str, Any]) -> str:
        return " ".join(str(data.get(k) or "") for k in ("titulo", "descripcion", "lugar_referencia", "color_principal", "marca", "subcategoria")).lower()

    async def _audit_lf(self, usuario_id: str | None, accion: str, entidad: str | None, entidad_id: str | None, detalle: dict[str, Any]) -> None:
        await self._audit.create_registro(usuario_id=usuario_id, modulo=AuditModulo.LOST_FOUND, accion=accion, entidad=entidad, entidad_id=entidad_id, detalle=detalle)

    async def _audit_categoria(
        self,
        actor_id: str,
        accion: str,
        categoria_id: str,
        *,
        before: dict[str, Any],
        after: dict[str, Any],
        resumen: str,
    ) -> None:
        detalle = build_detalle(
            origen="WEB_OPERATIVA",
            resultado=AuditResultado.EXITOSO,
            before=before,
            after=after,
            resumen=resumen,
        )
        await self._audit_lf(actor_id, accion, "categoria_objeto", categoria_id, detalle)

    @staticmethod
    def _slug_codigo(value: str) -> str:
        base = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
        slug = re.sub(r"[^A-Z0-9]+", "_", base.upper()).strip("_")
        return slug or "CATEGORIA"

    @staticmethod
    def _mark_comment_flags(
        rows: list[dict[str, Any]],
        usuario_id: str,
        is_operativo: bool,
        *,
        is_owner: bool = False,
        caso_tipo: str | None = None,
    ) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        for row in rows:
            es_autor = str(row.get("autor_id")) == usuario_id
            visible = bool(row.get("visible"))
            eliminado = row.get("deleted_at") is not None
            es_raiz = not row.get("parent_id")
            row["puede_eliminar"] = (
                es_autor
                and visible
                and row.get("created_at") >= now - timedelta(minutes=5)
            )
            # La gestión (editar/ocultar/eliminar) la realiza el equipo operativo/admin.
            row["puede_editar"] = is_operativo
            # Fijar: comentarios principales, por operativo/admin o el dueño del hilo.
            row["puede_fijar"] = es_raiz and visible and not eliminado and (is_operativo or is_owner)
            # Destacar: cualquier usuario salvo el autor del comentario.
            row["puede_reaccionar"] = visible and not eliminado and not es_autor
            row["tag_prioridad"] = lf_tag_priority(caso_tipo, row.get("tag"))
        return rows

    @staticmethod
    def _compute_profundidades(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Calcula la profundidad (raíz = 0) de cada comentario desde el conjunto cargado."""
        by_id = {str(row["id"]): row for row in rows}
        cache: dict[str, int] = {}

        def depth(cid: str, _guard: int = 0) -> int:
            if cid in cache:
                return cache[cid]
            row = by_id.get(cid)
            parent = str(row["parent_id"]) if row and row.get("parent_id") else None
            if not parent or parent not in by_id or _guard > COMENTARIOS_PROFUNDIDAD_MAX:
                cache[cid] = 0
            else:
                cache[cid] = depth(parent, _guard + 1) + 1
            return cache[cid]

        for row in rows:
            row["profundidad"] = depth(str(row["id"]))
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
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
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
    def _map_detail(cls, row: dict[str, Any], historial: list[dict[str, Any]], comentarios: list[dict[str, Any]], public: bool = False, *, mostrar_eliminado: bool = False, profundidad_maxima: int = COMENTARIOS_PROFUNDIDAD_DEFAULT) -> CasoLfDetail:
        base = cls._map_list(row, public=public).model_dump()
        base.pop("reportante", None)
        return CasoLfDetail(
            **base,
            comentarios_profundidad_maxima=profundidad_maxima,
            reportante=cls._usuario(row, public=public),
            contacto_info=None if public else row.get("contacto_info"),
            foto_adicional_urls=row.get("foto_adicional_urls") or [],
            etiquetas=row.get("etiquetas") or [],
            metadatos=row.get("metadatos") or {},
            oculto=bool(row.get("oculto")),
            motivo_cierre=row.get("motivo_cierre"),
            motivo_cierre_id=str(row["motivo_cierre_id"]) if row.get("motivo_cierre_id") else None,
            observaciones_cierre=row.get("observaciones_cierre"),
            custodia=(
                {
                    "id": str(row["custodia_id"]),
                    "estado": row["custodia_estado"],
                    "ubicacion_custodia": row["custodia_ubicacion"],
                    "fecha_recepcion": row["custodia_fecha_recepcion"],
                    "fecha_vencimiento": row["custodia_fecha_vencimiento"],
                }
                if row.get("custodia_id")
                else None
            ),
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
            comentarios=[cls._map_comment(c, mostrar_eliminado=mostrar_eliminado) for c in comentarios],
        )

    @classmethod
    def _map_comment(cls, row: dict[str, Any], *, mostrar_eliminado: bool = False) -> ComentarioLfItem:
        eliminado = row.get("deleted_at") is not None
        # Si el comentario fue eliminado y el solicitante no es operativo, se oculta el texto/imágenes.
        contenido = COMENTARIO_ELIMINADO_PLACEHOLDER if (eliminado and not mostrar_eliminado) else row["contenido"]
        imagenes = [] if (eliminado and not mostrar_eliminado) else (row.get("imagenes") or [])
        return ComentarioLfItem(
            id=str(row["id"]),
            caso_id=str(row["caso_id"]),
            parent_id=str(row["parent_id"]) if row.get("parent_id") else None,
            autor=cls._usuario(row, "autor_"),
            contenido=contenido,
            imagenes=imagenes,
            tag=row.get("tag"),
            tag_prioridad=int(row.get("tag_prioridad", 0) or 0),
            fijado=bool(row.get("fijado", False)),
            destacados=int(row.get("destacados_count", 0) or 0),
            reaccionado=bool(row.get("reaccionado", False)),
            puede_fijar=bool(row.get("puede_fijar", False)),
            puede_reaccionar=bool(row.get("puede_reaccionar", False)),
            visible=bool(row["visible"]),
            motivo_ocultamiento=row.get("motivo_ocultamiento"),
            profundidad=int(row.get("profundidad", 0) or 0),
            eliminado=eliminado,
            puede_eliminar=bool(row.get("puede_eliminar", False)),
            puede_editar=bool(row.get("puede_editar", False)),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
