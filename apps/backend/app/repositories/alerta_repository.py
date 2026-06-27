"""
Repository for campus alerts, segmentation and delivery tracking.
"""

from datetime import datetime, time, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, delete, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.sc_alertas import (
    AlertaCampus,
    AlertaEntrega,
    AlertaEvento,
    AlertaSegmento,
)
from app.models.sc_maestros import UbicacionMaestra
from app.models.sc_users import Rol, Usuario, UsuarioRol


ALERT_CODE_PREFIX = "ALR"

# Roles cuyos usuarios son audiencia de comunidad (candidatos a segmentacion por usuario).
ROLES_COMUNIDAD = {"comunidad", "estudiante", "docente", "personal"}


class AlertaRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _next_codigo(self, ahora: datetime) -> str:
        inicio = datetime.combine(ahora.date(), time.min, tzinfo=timezone.utc)
        fin = datetime.combine(ahora.date(), time.max, tzinfo=timezone.utc)
        count = await self.db.scalar(
            select(func.count(AlertaCampus.id)).where(
                AlertaCampus.created_at >= inicio,
                AlertaCampus.created_at <= fin,
            )
        )
        return f"{ALERT_CODE_PREFIX}-{ahora.strftime('%Y%m%d')}-{int(count or 0) + 1:04d}"

    def _base_select(self):
        return (
            select(
                AlertaCampus.id,
                AlertaCampus.codigo,
                AlertaCampus.tipo,
                AlertaCampus.familia,
                AlertaCampus.titulo,
                AlertaCampus.contenido,
                AlertaCampus.severidad,
                AlertaCampus.estado,
                AlertaCampus.origen,
                AlertaCampus.canales,
                AlertaCampus.zona_id,
                UbicacionMaestra.nombre.label("zona_nombre"),
                func.ST_Y(AlertaCampus.geom).label("latitud"),
                func.ST_X(AlertaCampus.geom).label("longitud"),
                AlertaCampus.radio_metros,
                AlertaCampus.fecha_programada,
                AlertaCampus.fecha_inicio,
                AlertaCampus.fecha_fin,
                AlertaCampus.vigencia_inicio,
                AlertaCampus.vigencia_fin,
                AlertaCampus.programada_para,
                AlertaCampus.created_by_id,
                AlertaCampus.created_at,
                AlertaCampus.updated_at,
                func.count(AlertaEntrega.id).label("entregas_total"),
                func.count(AlertaEntrega.id)
                .filter(AlertaEntrega.estado == "ENVIADA")
                .label("entregas_enviadas"),
                func.count(AlertaEntrega.id)
                .filter(AlertaEntrega.estado == "FALLIDA")
                .label("entregas_fallidas"),
            )
            .outerjoin(UbicacionMaestra, UbicacionMaestra.id == AlertaCampus.zona_id)
            .outerjoin(AlertaEntrega, AlertaEntrega.alerta_id == AlertaCampus.id)
            .group_by(AlertaCampus.id, UbicacionMaestra.nombre)
        )

    async def list_alertas(
        self,
        *,
        search: str | None = None,
        estado: str | None = None,
        severidad: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        statement = self._base_select().order_by(desc(AlertaCampus.created_at)).limit(limit)
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(AlertaCampus.codigo.ilike(pattern), AlertaCampus.titulo.ilike(pattern))
            )
        if estado:
            statement = statement.where(AlertaCampus.estado == estado)
        if severidad:
            statement = statement.where(AlertaCampus.severidad == severidad)
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_alerta(self, alerta_id: str) -> dict[str, Any] | None:
        statement = self._base_select().where(AlertaCampus.id == UUID(alerta_id)).limit(1)
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def create_alerta(
        self,
        *,
        data: dict[str, Any],
        segmentos: list[dict[str, Any]],
    ) -> dict[str, Any]:
        ahora = datetime.now(timezone.utc)
        alerta = AlertaCampus(
            codigo=await self._next_codigo(ahora),
            tipo=data.get("tipo", "ALR-MAS-SEG"),
            familia=data.get("familia", "A"),
            titulo=data["titulo"],
            contenido=data["contenido"],
            mensaje=data.get("mensaje") or data["contenido"],
            severidad=data["severidad"],
            origen=data.get("origen", "MANUAL"),
            canales=data["canales"],
            zona_id=UUID(data["zona_id"]) if data.get("zona_id") else None,
            radio_metros=data.get("radio_metros"),
            fecha_programada=data.get("fecha_programada"),
            fecha_fin=data.get("fecha_fin"),
            vigencia_fin=data.get("fecha_fin"),
            programada_para=data.get("fecha_programada"),
            created_by_id=UUID(data["created_by_id"]),
            creada_por_id=UUID(data["created_by_id"]),
            incidente_id=UUID(data["incidente_id"]) if data.get("incidente_id") else None,
        )
        latitud = data.get("latitud")
        longitud = data.get("longitud")
        if latitud is not None and longitud is not None:
            alerta.geom = func.ST_SetSRID(func.ST_MakePoint(longitud, latitud), 4326)
        self.db.add(alerta)
        await self.db.flush()
        await self._replace_segmentos(str(alerta.id), segmentos)
        await self.add_evento(
            alerta_id=str(alerta.id),
            tipo_evento="CREADA",
            actor_usuario_id=data["created_by_id"],
            detalle={"estado": "BORRADOR"},
        )
        return await self.get_alerta(str(alerta.id)) or {}

    async def update_alerta(
        self,
        alerta_id: str,
        *,
        data: dict[str, Any],
        segmentos: list[dict[str, Any]] | None,
    ) -> dict[str, Any] | None:
        values = {k: v for k, v in data.items() if k not in {"latitud", "longitud"}}
        values["updated_at"] = datetime.now(timezone.utc)
        latitud = data.get("latitud")
        longitud = data.get("longitud")
        if latitud is not None and longitud is not None:
            values["geom"] = func.ST_SetSRID(func.ST_MakePoint(longitud, latitud), 4326)
        statement = (
            update(AlertaCampus)
            .where(AlertaCampus.id == UUID(alerta_id), AlertaCampus.estado.in_(("BORRADOR", "PROGRAMADA")))
            .values(**values)
            .returning(AlertaCampus.id)
        )
        result = await self.db.execute(statement)
        if result.scalar_one_or_none() is None:
            return None
        if segmentos is not None:
            await self._replace_segmentos(alerta_id, segmentos)
        return await self.get_alerta(alerta_id)

    async def set_estado(
        self,
        alerta_id: str,
        *,
        estado: str,
        actor_id: str,
    ) -> bool:
        values: dict[str, Any] = {"estado": estado, "updated_at": datetime.now(timezone.utc)}
        if estado in {"ACTIVA", "ENVIADA"}:
            now = datetime.now(timezone.utc)
            values["fecha_inicio"] = now
            values["vigencia_inicio"] = now
            values["published_by_id"] = UUID(actor_id)
            values["aprobada_por_id"] = UUID(actor_id)
        if estado in {"ATENDIDA", "FINALIZADA"}:
            values["atendida_por_id"] = UUID(actor_id)
        statement = (
            update(AlertaCampus)
            .where(AlertaCampus.id == UUID(alerta_id))
            .values(**values)
            .returning(AlertaCampus.id)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none() is not None

    async def _replace_segmentos(self, alerta_id: str, segmentos: list[dict[str, Any]]) -> None:
        await self.db.execute(delete(AlertaSegmento).where(AlertaSegmento.alerta_id == UUID(alerta_id)))
        for item in segmentos:
            self.db.add(
                AlertaSegmento(
                    alerta_id=UUID(alerta_id),
                    tipo=item["tipo"],
                    valor=item["valor"],
                    usuario_id=UUID(item["usuario_id"]) if item.get("usuario_id") else None,
                    ubicacion_id=UUID(item["ubicacion_id"]) if item.get("ubicacion_id") else None,
                    radio_metros=item.get("radio_metros"),
                )
            )

    async def list_segmentos(self, alerta_id: str) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(
                AlertaSegmento.id,
                AlertaSegmento.tipo,
                AlertaSegmento.valor,
                AlertaSegmento.usuario_id,
                AlertaSegmento.ubicacion_id,
                AlertaSegmento.radio_metros,
            )
            .where(AlertaSegmento.alerta_id == UUID(alerta_id))
            .order_by(AlertaSegmento.created_at.asc())
        )
        return [dict(row) for row in result.mappings()]

    async def list_entregas(self, alerta_id: str, limit: int = 500) -> list[dict[str, Any]]:
        Dest = aliased(Usuario)
        result = await self.db.execute(
            select(
                AlertaEntrega.id,
                AlertaEntrega.destinatario_id,
                func.nullif(func.trim(func.concat(func.coalesce(Dest.nombre, ""), " ", func.coalesce(Dest.apellido, ""))), "").label("destinatario_nombre"),
                Dest.email.label("destinatario_email"),
                AlertaEntrega.canal,
                AlertaEntrega.estado,
                AlertaEntrega.error_detalle,
                AlertaEntrega.fecha_envio,
                AlertaEntrega.created_at,
            )
            .outerjoin(Dest, Dest.id == AlertaEntrega.destinatario_id)
            .where(AlertaEntrega.alerta_id == UUID(alerta_id))
            .order_by(desc(AlertaEntrega.created_at))
            .limit(limit)
        )
        return [dict(row) for row in result.mappings()]

    async def list_eventos(self, alerta_id: str) -> list[dict[str, Any]]:
        Actor = aliased(Usuario)
        result = await self.db.execute(
            select(
                AlertaEvento.id,
                AlertaEvento.tipo_evento,
                AlertaEvento.actor_usuario_id,
                func.nullif(func.trim(func.concat(func.coalesce(Actor.nombre, ""), " ", func.coalesce(Actor.apellido, ""))), "").label("actor_nombre"),
                AlertaEvento.detalle,
                AlertaEvento.created_at,
            )
            .outerjoin(Actor, Actor.id == AlertaEvento.actor_usuario_id)
            .where(AlertaEvento.alerta_id == UUID(alerta_id))
            .order_by(AlertaEvento.created_at.asc())
        )
        return [dict(row) for row in result.mappings()]

    async def add_evento(
        self,
        *,
        alerta_id: str,
        tipo_evento: str,
        actor_usuario_id: str | None,
        detalle: dict[str, Any] | None = None,
    ) -> None:
        self.db.add(
            AlertaEvento(
                alerta_id=UUID(alerta_id),
                tipo_evento=tipo_evento,
                accion=tipo_evento,
                actor_usuario_id=UUID(actor_usuario_id) if actor_usuario_id else None,
                detalle=detalle or {},
                estado_nuevo=(detalle or {}).get("estado"),
            )
        )

    async def list_usuarios_comunidad(
        self, *, search: str | None = None, limit: int = 100
    ) -> list[dict[str, Any]]:
        """Usuarios activos con rol de comunidad, candidatos a segmentacion por usuario."""
        community_user_ids = (
            select(UsuarioRol.usuario_id)
            .join(Rol, Rol.id == UsuarioRol.rol_id)
            .where(func.lower(Rol.nombre).in_(ROLES_COMUNIDAD))
        )
        statement = (
            select(Usuario.id, Usuario.email, Usuario.nombre, Usuario.apellido)
            .where(
                Usuario.deleted_at.is_(None),
                Usuario.estado == "ACTIVO",
                Usuario.id.in_(community_user_ids),
            )
            .distinct()
        )
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(Usuario.nombre).like(term),
                    func.lower(Usuario.apellido).like(term),
                    func.lower(Usuario.email).like(term),
                )
            )
        statement = statement.order_by(Usuario.apellido, Usuario.nombre).limit(limit)
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def resolve_destinatarios(self, alerta_id: str) -> list[dict[str, Any]]:
        segmentos = await self.list_segmentos(alerta_id)
        rol_values = {s["valor"].lower() for s in segmentos if s["tipo"] == "ROL"}
        departamentos = {s["valor"].lower() for s in segmentos if s["tipo"] == "DEPARTAMENTO"}
        usuarios = {UUID(s["usuario_id"]) for s in segmentos if s.get("usuario_id")}

        statement = (
            select(Usuario.id, Usuario.email, Usuario.telefono, Usuario.nombre, Usuario.apellido)
            .where(Usuario.deleted_at.is_(None), Usuario.estado == "ACTIVO")
            .distinct()
        )
        conditions = []
        if rol_values:
            role_user_ids = (
                select(UsuarioRol.usuario_id)
                .join(Rol, Rol.id == UsuarioRol.rol_id)
                .where(func.lower(Rol.nombre).in_(rol_values))
            )
            conditions.append(Usuario.id.in_(role_user_ids))
        if departamentos:
            conditions.append(func.lower(Usuario.departamento).in_(departamentos))
        if usuarios:
            conditions.append(Usuario.id.in_(usuarios))
        if conditions:
            statement = statement.where(or_(*conditions))

        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def create_entrega(
        self,
        *,
        alerta_id: str,
        destinatario_id: str | None,
        canal: str,
        estado: str,
        notificacion_id: str | None = None,
        external_message_id: str | None = None,
        error_detalle: str | None = None,
    ) -> None:
        self.db.add(
            AlertaEntrega(
                alerta_id=UUID(alerta_id),
                destinatario_id=UUID(destinatario_id) if destinatario_id else None,
                canal=canal,
                estado=estado,
                notificacion_id=UUID(notificacion_id) if notificacion_id else None,
                external_message_id=external_message_id,
                error_detalle=error_detalle,
                fecha_envio=datetime.now(timezone.utc) if estado in {"ENVIADA", "FALLIDA", "DESCARTADA"} else None,
            )
        )

    async def stats(self) -> dict[str, Any]:
        alertas = await self.db.execute(
            select(
                func.count(AlertaCampus.id).label("total"),
                AlertaCampus.estado,
                AlertaCampus.severidad,
            ).group_by(AlertaCampus.estado, AlertaCampus.severidad)
        )
        entregas = await self.db.execute(
            select(
                AlertaEntrega.canal,
                AlertaEntrega.estado,
                func.count(AlertaEntrega.id).label("total"),
            ).group_by(AlertaEntrega.canal, AlertaEntrega.estado)
        )
        return {
            "alertas": [dict(row) for row in alertas.mappings()],
            "entregas": [dict(row) for row in entregas.mappings()],
        }
