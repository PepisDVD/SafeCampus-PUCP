from datetime import datetime, time, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, case, desc, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.constants import LOST_FOUND_CODE_PREFIX
from app.models.sc_lost_found import (
    CasoLostFound,
    CategoriaObjeto,
    ComentarioCasoLf,
    ConfiguracionLf,
    CustodiaObjeto,
    HistorialCasoLf,
    MatchSugerido,
    ParticipanteHiloLf,
)
from app.models.sc_users import Rol, Usuario, UsuarioRol


class LostFoundRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _base_select(self):
        ultimo_comentario = (
            select(ComentarioCasoLf.contenido)
            .where(ComentarioCasoLf.caso_id == CasoLostFound.id)
            .order_by(ComentarioCasoLf.created_at.desc())
            .limit(1)
            .scalar_subquery()
        )
        ultimo_comentario_at = (
            select(ComentarioCasoLf.created_at)
            .where(ComentarioCasoLf.caso_id == CasoLostFound.id)
            .order_by(ComentarioCasoLf.created_at.desc())
            .limit(1)
            .scalar_subquery()
        )
        return (
            select(
                CasoLostFound.id,
                CasoLostFound.codigo,
                CasoLostFound.tipo,
                CasoLostFound.estado,
                CasoLostFound.titulo,
                CasoLostFound.descripcion,
                CasoLostFound.categoria_id,
                CategoriaObjeto.nombre.label("categoria_nombre"),
                CasoLostFound.subcategoria,
                CasoLostFound.lugar_referencia,
                CasoLostFound.fecha_evento,
                CasoLostFound.foto_url,
                CasoLostFound.color_principal,
                CasoLostFound.marca,
                CasoLostFound.conteo_comentarios,
                ultimo_comentario.label("ultimo_comentario"),
                ultimo_comentario_at.label("ultimo_comentario_at"),
                CasoLostFound.reportante_id,
                Usuario.nombre.label("reportante_nombre"),
                Usuario.apellido.label("reportante_apellido"),
                Usuario.email.label("reportante_email"),
                Usuario.avatar_url.label("reportante_avatar_url"),
                CasoLostFound.created_at,
            )
            .outerjoin(CategoriaObjeto, CategoriaObjeto.id == CasoLostFound.categoria_id)
            .outerjoin(Usuario, Usuario.id == CasoLostFound.reportante_id)
        )

    async def list_categorias(self, include_inactive: bool = False) -> list[dict[str, Any]]:
        statement = select(CategoriaObjeto).order_by(CategoriaObjeto.nombre.asc())
        if not include_inactive:
            statement = statement.where(CategoriaObjeto.activa.is_(True))
        result = await self.db.execute(statement)
        return [
            {
                "id": str(row.id),
                "nombre": row.nombre,
                "descripcion": row.descripcion,
                "icono": row.icono,
                "activa": row.activa,
                "es_perecible": row.es_perecible,
                "metadatos_schema": row.metadatos_schema or {},
            }
            for row in result.scalars()
        ]

    async def upsert_categoria(self, data: dict[str, Any]) -> dict[str, Any]:
        categoria = CategoriaObjeto(**data)
        self.db.add(categoria)
        await self.db.flush()
        await self.db.refresh(categoria)
        return {
            "id": str(categoria.id),
            "nombre": categoria.nombre,
            "descripcion": categoria.descripcion,
            "icono": categoria.icono,
            "activa": categoria.activa,
            "es_perecible": categoria.es_perecible,
            "metadatos_schema": categoria.metadatos_schema or {},
        }

    async def update_categoria(self, categoria_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
        statement = (
            update(CategoriaObjeto)
            .where(CategoriaObjeto.id == UUID(categoria_id))
            .values(**data)
            .returning(CategoriaObjeto)
        )
        result = await self.db.execute(statement)
        row = result.scalar_one_or_none()
        if not row:
            return None
        return {
            "id": str(row.id),
            "nombre": row.nombre,
            "descripcion": row.descripcion,
            "icono": row.icono,
            "activa": row.activa,
            "es_perecible": row.es_perecible,
            "metadatos_schema": row.metadatos_schema or {},
        }

    async def list_feed(
        self,
        *,
        search: str | None,
        tipo: str | None,
        estado: str | None,
        categoria_id: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        statement = self._base_select().where(CasoLostFound.estado.in_(("ABIERTO", "EN_REVISION", "CONFIRMADO", "EN_CUSTODIA")))
        if tipo:
            statement = statement.where(CasoLostFound.tipo == tipo)
        if estado:
            statement = statement.where(CasoLostFound.estado == estado)
        if categoria_id:
            statement = statement.where(CasoLostFound.categoria_id == UUID(categoria_id))
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    CasoLostFound.codigo.ilike(pattern),
                    CasoLostFound.titulo.ilike(pattern),
                    CasoLostFound.descripcion.ilike(pattern),
                    CasoLostFound.lugar_referencia.ilike(pattern),
                    CasoLostFound.marca.ilike(pattern),
                    CasoLostFound.color_principal.ilike(pattern),
                )
            )
        result = await self.db.execute(statement.order_by(CasoLostFound.created_at.desc()).limit(limit))
        return [dict(row) for row in result.mappings()]

    async def list_operativo(
        self,
        *,
        search: str | None,
        tipo: str | None,
        estado: str | None,
        categoria_id: str | None,
        cursor: datetime | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        statement = self._base_select()
        if tipo:
            statement = statement.where(CasoLostFound.tipo == tipo)
        if estado:
            statement = statement.where(CasoLostFound.estado == estado)
        if categoria_id:
            statement = statement.where(CasoLostFound.categoria_id == UUID(categoria_id))
        if cursor:
            statement = statement.where(CasoLostFound.created_at < cursor)
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(or_(CasoLostFound.codigo.ilike(pattern), CasoLostFound.titulo.ilike(pattern)))
        result = await self.db.execute(statement.order_by(CasoLostFound.created_at.desc()).limit(limit))
        return [dict(row) for row in result.mappings()]

    async def list_by_reportante(self, usuario_id: str, limit: int) -> list[dict[str, Any]]:
        result = await self.db.execute(
            self._base_select()
            .where(CasoLostFound.reportante_id == UUID(usuario_id))
            .order_by(CasoLostFound.created_at.desc())
            .limit(limit)
        )
        return [dict(row) for row in result.mappings()]

    async def _next_codigo(self, ahora: datetime) -> str:
        inicio_mes = datetime(ahora.year, ahora.month, 1, tzinfo=timezone.utc)
        if ahora.month == 12:
            fin_mes = datetime(ahora.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            fin_mes = datetime(ahora.year, ahora.month + 1, 1, tzinfo=timezone.utc)
        count = await self.db.scalar(
            select(func.count(CasoLostFound.id)).where(
                CasoLostFound.created_at >= inicio_mes,
                CasoLostFound.created_at < fin_mes,
            )
        ) or 0
        return f"{LOST_FOUND_CODE_PREFIX}-{ahora.strftime('%Y%m')}-{int(count) + 1:05d}"

    async def create_caso(self, reportante_id: str, data: dict[str, Any]) -> dict[str, Any]:
        ahora = datetime.now(timezone.utc)
        latitud = data.pop("latitud", None)
        longitud = data.pop("longitud", None)
        caso = CasoLostFound(
            codigo=await self._next_codigo(ahora),
            estado="ABIERTO",
            reportante_id=UUID(reportante_id),
            **data,
        )
        if latitud is not None and longitud is not None:
            caso.geom = func.ST_SetSRID(func.ST_MakePoint(longitud, latitud), 4326)
        self.db.add(caso)
        await self.db.flush()
        await self.db.refresh(caso)
        await self.add_historial(str(caso.id), None, "ABIERTO", "Creacion de caso", reportante_id, None)
        await self.upsert_participacion(str(caso.id), reportante_id, True)
        return {"id": str(caso.id), "codigo": caso.codigo, "estado": caso.estado, "created_at": caso.created_at}

    async def get_detail_by_ref(self, ref: str) -> dict[str, Any] | None:
        Reportante = aliased(Usuario)
        filters = []
        try:
            filters.append(CasoLostFound.id == UUID(ref))
        except ValueError:
            filters.append(CasoLostFound.codigo == ref)
        statement = (
            select(
                CasoLostFound,
                CategoriaObjeto.nombre.label("categoria_nombre"),
                func.ST_Y(CasoLostFound.geom).label("latitud"),
                func.ST_X(CasoLostFound.geom).label("longitud"),
                Reportante.nombre.label("reportante_nombre"),
                Reportante.apellido.label("reportante_apellido"),
                Reportante.email.label("reportante_email"),
                Reportante.avatar_url.label("reportante_avatar_url"),
            )
            .outerjoin(CategoriaObjeto, CategoriaObjeto.id == CasoLostFound.categoria_id)
            .outerjoin(Reportante, Reportante.id == CasoLostFound.reportante_id)
            .where(*filters)
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        if not row:
            return None
        caso = row["CasoLostFound"]
        return {
            **{k: getattr(caso, k) for k in (
                "id", "codigo", "tipo", "estado", "titulo", "descripcion", "categoria_id",
                "subcategoria", "lugar_referencia", "fecha_evento", "foto_url",
                "color_principal", "marca", "conteo_comentarios", "contacto_info",
                "foto_adicional_urls", "etiquetas", "motivo_cierre", "observaciones_cierre",
                "created_at", "updated_at",
            )},
            "categoria_nombre": row["categoria_nombre"],
            "latitud": row["latitud"],
            "longitud": row["longitud"],
            "reportante_id": caso.reportante_id,
            "reportante_nombre": row["reportante_nombre"],
            "reportante_apellido": row["reportante_apellido"],
            "reportante_email": row["reportante_email"],
            "reportante_avatar_url": row["reportante_avatar_url"],
        }

    async def get_estado(self, caso_id: str) -> dict[str, Any] | None:
        result = await self.db.execute(select(CasoLostFound.id, CasoLostFound.codigo, CasoLostFound.estado, CasoLostFound.tipo, CasoLostFound.reportante_id).where(CasoLostFound.id == UUID(caso_id)).limit(1))
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def update_estado(
        self,
        *,
        caso_id: str,
        estado: str,
        ejecutor_id: str,
        comentario: str | None,
        motivo_cierre: str | None = None,
        observaciones_cierre: str | None = None,
    ) -> dict[str, Any] | None:
        actual = await self.get_estado(caso_id)
        if not actual:
            return None
        values: dict[str, Any] = {"estado": estado, "updated_at": datetime.now(timezone.utc)}
        if motivo_cierre:
            values["motivo_cierre"] = motivo_cierre
        if observaciones_cierre:
            values["observaciones_cierre"] = observaciones_cierre
        if estado == "CERRADO":
            values["cerrado_por_id"] = UUID(ejecutor_id)
        await self.db.execute(update(CasoLostFound).where(CasoLostFound.id == UUID(caso_id)).values(**values))
        await self.add_historial(caso_id, str(actual["estado"]), estado, "Cambio de estado", ejecutor_id, comentario)
        return {**actual, "estado_anterior": actual["estado"], "estado_nuevo": estado, "comentario": comentario}

    async def update_fotos(
        self,
        caso_id: str,
        *,
        foto_url: str | None,
        foto_adicional_urls: list[str],
    ) -> bool:
        result = await self.db.execute(
            update(CasoLostFound)
            .where(CasoLostFound.id == UUID(caso_id))
            .values(
                foto_url=foto_url,
                foto_adicional_urls=foto_adicional_urls,
                updated_at=datetime.now(timezone.utc),
            )
            .returning(CasoLostFound.id)
        )
        return result.scalar_one_or_none() is not None

    async def add_historial(self, caso_id: str, estado_anterior: str | None, estado_nuevo: str, accion: str, ejecutor_id: str, comentario: str | None) -> None:
        self.db.add(HistorialCasoLf(caso_id=UUID(caso_id), estado_anterior=estado_anterior, estado_nuevo=estado_nuevo, accion=accion, comentario=comentario, ejecutado_por_id=UUID(ejecutor_id)))

    async def list_historial(self, caso_id: str) -> list[dict[str, Any]]:
        statement = (
            select(HistorialCasoLf.id, HistorialCasoLf.estado_anterior, HistorialCasoLf.estado_nuevo, HistorialCasoLf.accion, HistorialCasoLf.comentario, HistorialCasoLf.created_at, HistorialCasoLf.ejecutado_por_id, Usuario.nombre.label("ejecutor_nombre"), Usuario.apellido.label("ejecutor_apellido"), Usuario.email.label("ejecutor_email"), Usuario.avatar_url.label("ejecutor_avatar_url"))
            .outerjoin(Usuario, Usuario.id == HistorialCasoLf.ejecutado_por_id)
            .where(HistorialCasoLf.caso_id == UUID(caso_id))
            .order_by(HistorialCasoLf.created_at.asc())
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def find_match_candidates(self, caso: dict[str, Any], limit: int = 40) -> list[dict[str, Any]]:
        opposite = "ENCONTRADO" if caso["tipo"] == "PERDIDO" else "PERDIDO"
        result = await self.db.execute(
            select(CasoLostFound.id, CasoLostFound.codigo, CasoLostFound.tipo, CasoLostFound.estado, CasoLostFound.titulo, CasoLostFound.descripcion, CasoLostFound.categoria_id, CasoLostFound.lugar_referencia, CasoLostFound.fecha_evento, CasoLostFound.color_principal, CasoLostFound.marca, CasoLostFound.etiquetas, CasoLostFound.reportante_id)
            .where(CasoLostFound.tipo == opposite, CasoLostFound.estado.in_(("ABIERTO", "EN_REVISION", "EN_CUSTODIA")))
            .order_by(desc(CasoLostFound.created_at))
            .limit(limit)
        )
        return [dict(row) for row in result.mappings()]

    async def create_match(self, perdido_id: str, encontrado_id: str, score: float, detalle: dict[str, Any]) -> dict[str, Any] | None:
        statement = (
            insert(MatchSugerido)
            .values(caso_perdido_id=UUID(perdido_id), caso_encontrado_id=UUID(encontrado_id), score_total=score, score_detalle=detalle, estado="SUGERIDO")
            .on_conflict_do_nothing(index_elements=["caso_perdido_id", "caso_encontrado_id"])
            .returning(MatchSugerido.id)
        )
        result = await self.db.execute(statement)
        match_id = result.scalar_one_or_none()
        return {"id": str(match_id)} if match_id else None

    async def list_matches_for_user(self, usuario_id: str) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(MatchSugerido)
            .join(CasoLostFound, CasoLostFound.id == MatchSugerido.caso_perdido_id)
            .where(CasoLostFound.reportante_id == UUID(usuario_id))
            .order_by(MatchSugerido.created_at.desc())
        )
        return [{"match": row} for row in result.scalars()]

    async def list_matches_for_case(self, caso_id: str) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(MatchSugerido)
            .where(or_(MatchSugerido.caso_perdido_id == UUID(caso_id), MatchSugerido.caso_encontrado_id == UUID(caso_id)))
            .order_by(MatchSugerido.created_at.desc())
        )
        return [{"match": row} for row in result.scalars()]

    async def get_match(self, match_id: str) -> MatchSugerido | None:
        return await self.db.get(MatchSugerido, UUID(match_id))

    async def update_match_estado(self, match_id: str, estado: str, usuario_id: str, comentario: str | None) -> None:
        await self.db.execute(update(MatchSugerido).where(MatchSugerido.id == UUID(match_id)).values(estado=estado, respondido_por_id=UUID(usuario_id), respuesta_comentario=comentario, updated_at=datetime.now(timezone.utc)))

    async def list_comentarios(self, caso_id: str, include_hidden: bool = False) -> list[dict[str, Any]]:
        autor_rol = (
            select(Rol.nombre)
            .join(UsuarioRol, UsuarioRol.rol_id == Rol.id)
            .where(
                UsuarioRol.usuario_id == ComentarioCasoLf.autor_id,
                func.lower(Rol.nombre).in_(("supervisor", "operador")),
            )
            .order_by(case((func.lower(Rol.nombre) == "supervisor", 0), else_=1))
            .limit(1)
            .scalar_subquery()
        )
        statement = (
            select(ComentarioCasoLf.id, ComentarioCasoLf.caso_id, ComentarioCasoLf.autor_id, ComentarioCasoLf.contenido, ComentarioCasoLf.visible, ComentarioCasoLf.motivo_ocultamiento, ComentarioCasoLf.created_at, ComentarioCasoLf.updated_at, Usuario.nombre.label("autor_nombre"), Usuario.apellido.label("autor_apellido"), Usuario.email.label("autor_email"), Usuario.avatar_url.label("autor_avatar_url"), autor_rol.label("autor_rol"))
            .outerjoin(Usuario, Usuario.id == ComentarioCasoLf.autor_id)
            .where(ComentarioCasoLf.caso_id == UUID(caso_id))
            .order_by(ComentarioCasoLf.created_at.asc())
        )
        if not include_hidden:
            statement = statement.where(ComentarioCasoLf.visible.is_(True))
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def create_comentario(self, caso_id: str, autor_id: str, contenido: str) -> dict[str, Any]:
        comentario = ComentarioCasoLf(caso_id=UUID(caso_id), autor_id=UUID(autor_id), contenido=contenido)
        self.db.add(comentario)
        await self.db.execute(update(CasoLostFound).where(CasoLostFound.id == UUID(caso_id)).values(conteo_comentarios=CasoLostFound.conteo_comentarios + 1, updated_at=datetime.now(timezone.utc)))
        await self.upsert_participacion(caso_id, autor_id, True)
        await self.db.flush()
        await self.db.refresh(comentario)
        return {"id": comentario.id, "caso_id": comentario.caso_id, "autor_id": comentario.autor_id, "contenido": comentario.contenido, "visible": comentario.visible, "motivo_ocultamiento": comentario.motivo_ocultamiento, "created_at": comentario.created_at, "updated_at": comentario.updated_at}

    async def update_comentario_visibility(self, comentario_id: str, visible: bool, actor_id: str, motivo: str | None) -> bool:
        result = await self.db.execute(update(ComentarioCasoLf).where(ComentarioCasoLf.id == UUID(comentario_id)).values(visible=visible, ocultado_por_id=UUID(actor_id), motivo_ocultamiento=motivo, updated_at=datetime.now(timezone.utc)).returning(ComentarioCasoLf.id))
        return result.scalar_one_or_none() is not None

    async def upsert_participacion(self, caso_id: str, usuario_id: str, suscrito: bool) -> None:
        await self.db.execute(
            insert(ParticipanteHiloLf)
            .values(caso_id=UUID(caso_id), usuario_id=UUID(usuario_id), suscrito=suscrito)
            .on_conflict_do_update(index_elements=["caso_id", "usuario_id"], set_={"suscrito": suscrito, "updated_at": datetime.now(timezone.utc)})
        )

    async def list_participantes(self, caso_id: str) -> list[dict[str, Any]]:
        result = await self.db.execute(select(ParticipanteHiloLf.usuario_id).where(ParticipanteHiloLf.caso_id == UUID(caso_id), ParticipanteHiloLf.suscrito.is_(True)))
        return [dict(row) for row in result.mappings()]

    async def create_custodia(self, caso_id: str, actor_id: str, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        vencimiento = now + (timedelta(hours=24) if data["es_perecible"] else timedelta(days=15))
        custodia = CustodiaObjeto(caso_id=UUID(caso_id), recibido_por_id=UUID(actor_id), fecha_vencimiento=vencimiento, **data)
        self.db.add(custodia)
        await self.db.flush()
        await self.db.refresh(custodia)
        return self._custodia_dict(custodia)

    async def list_custodias(
        self,
        *,
        estado: str | None,
        search: str | None,
        vencimiento: str | None,
        page: int,
        per_page: int,
    ) -> tuple[list[dict[str, Any]], int]:
        filters = []
        if estado:
            filters.append(CustodiaObjeto.estado == estado)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(or_(
                CasoLostFound.codigo.ilike(pattern),
                CasoLostFound.titulo.ilike(pattern),
                CustodiaObjeto.ubicacion_custodia.ilike(pattern),
                CustodiaObjeto.observaciones.ilike(pattern),
            ))
        now = datetime.now(timezone.utc)
        if vencimiento == "proxima":
            filters.append(CustodiaObjeto.estado == "ACTIVA")
            filters.append(CustodiaObjeto.fecha_vencimiento <= now + timedelta(days=2))
        elif vencimiento == "vencida":
            filters.append(CustodiaObjeto.estado.in_(("ACTIVA", "PROXIMA_VENCER", "VENCIDA")))
            filters.append(CustodiaObjeto.fecha_vencimiento < now)
        elif vencimiento == "vigente":
            filters.append(CustodiaObjeto.estado.in_(("ACTIVA", "PROXIMA_VENCER")))
            filters.append(CustodiaObjeto.fecha_vencimiento >= now)

        base = select(CustodiaObjeto, CasoLostFound.codigo, CasoLostFound.titulo).join(CasoLostFound, CasoLostFound.id == CustodiaObjeto.caso_id).where(*filters)
        total = await self.db.scalar(select(func.count()).select_from(base.subquery())) or 0
        result = await self.db.execute(
            base.order_by(CustodiaObjeto.fecha_vencimiento.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        items = [{**self._custodia_dict(row["CustodiaObjeto"]), "codigo": row["codigo"], "titulo": row["titulo"]} for row in result.mappings()]
        return items, int(total)

    async def get_custodia(self, custodia_id: str) -> CustodiaObjeto | None:
        return await self.db.get(CustodiaObjeto, UUID(custodia_id))

    async def update_custodia(self, custodia_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
        data["updated_at"] = datetime.now(timezone.utc)
        result = await self.db.execute(update(CustodiaObjeto).where(CustodiaObjeto.id == UUID(custodia_id)).values(**data).returning(CustodiaObjeto))
        row = result.scalar_one_or_none()
        return self._custodia_dict(row) if row else None

    async def get_config(self) -> list[dict[str, Any]]:
        result = await self.db.execute(select(ConfiguracionLf).order_by(ConfiguracionLf.key.asc()))
        return [{"key": r.key, "value": r.value, "descripcion": r.descripcion, "updated_at": r.updated_at} for r in result.scalars()]

    async def get_config_value(self, key: str) -> dict[str, Any] | None:
        row = await self.db.get(ConfiguracionLf, key)
        return row.value if row else None

    async def update_config(self, key: str, value: dict[str, Any], descripcion: str | None, actor_id: str) -> dict[str, Any]:
        statement = (
            insert(ConfiguracionLf)
            .values(key=key, value=value, descripcion=descripcion, updated_by_id=UUID(actor_id))
            .on_conflict_do_update(index_elements=["key"], set_={"value": value, "descripcion": descripcion, "updated_by_id": UUID(actor_id), "updated_at": datetime.now(timezone.utc)})
            .returning(ConfiguracionLf)
        )
        result = await self.db.execute(statement)
        row = result.scalar_one()
        return {"key": row.key, "value": row.value, "descripcion": row.descripcion, "updated_at": row.updated_at}

    async def get_kpis(self) -> dict[str, Any]:
        statement = select(
            func.count(CasoLostFound.id).label("total_casos"),
            func.count().filter(CasoLostFound.estado == "ABIERTO").label("abiertos"),
            func.count().filter(CasoLostFound.estado == "EN_CUSTODIA").label("en_custodia"),
            func.count().filter(CasoLostFound.estado == "CERRADO").label("cerrados"),
            func.count().filter(CasoLostFound.motivo_cierre == "DEVUELTO").label("devueltos"),
        )
        row = (await self.db.execute(statement)).mappings().one()
        match_row = (await self.db.execute(select(func.count(MatchSugerido.id).label("sugeridos"), func.count().filter(MatchSugerido.estado == "CONFIRMADO").label("confirmados")))).mappings().one()
        cutoff = datetime.now(timezone.utc) + timedelta(days=2)
        por_vencer = await self.db.scalar(select(func.count(CustodiaObjeto.id)).where(CustodiaObjeto.estado == "ACTIVA", CustodiaObjeto.fecha_vencimiento <= cutoff)) or 0
        zonas = await self.db.execute(select(CasoLostFound.lugar_referencia.label("zona"), func.count().label("total")).where(CasoLostFound.lugar_referencia.is_not(None)).group_by(CasoLostFound.lugar_referencia).order_by(desc("total")).limit(8))
        total = int(row["total_casos"] or 0)
        return {
            "total_casos": total,
            "abiertos": int(row["abiertos"] or 0),
            "en_custodia": int(row["en_custodia"] or 0),
            "cerrados": int(row["cerrados"] or 0),
            "tasa_recuperacion": round((int(row["devueltos"] or 0) / total) * 100, 1) if total else 0,
            "matches_sugeridos": int(match_row["sugeridos"] or 0),
            "matches_confirmados": int(match_row["confirmados"] or 0),
            "custodias_por_vencer": int(por_vencer),
            "por_zona": [dict(r) for r in zonas.mappings()],
        }

    @staticmethod
    def _custodia_dict(row: CustodiaObjeto) -> dict[str, Any]:
        return {
            "id": str(row.id),
            "caso_id": str(row.caso_id),
            "estado": row.estado,
            "ubicacion_custodia": row.ubicacion_custodia,
            "observaciones": row.observaciones,
            "es_perecible": row.es_perecible,
            "fecha_recepcion": row.fecha_recepcion,
            "fecha_vencimiento": row.fecha_vencimiento,
            "reclamante_id": str(row.reclamante_id) if row.reclamante_id else None,
            "metodo_verificacion": row.metodo_verificacion,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
