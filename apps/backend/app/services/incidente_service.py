from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from app.core.constants import EstadoIncidente, EstadoReporte, NivelSeveridad, TipoCanal
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.incidente_repository import IncidenteRepository
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.incidente import (
    IncidenteCreateItem,
    IncidenteCreateRequest,
    IncidenteCreateResponse,
    IncidenteDetailResponse,
    IncidenteListItem,
    IncidenteListResponse,
)


class IncidenteService:
    def __init__(
        self,
        *,
        repository: IncidenteRepository,
        user_repository: UserSyncRepository,
        auth_client: SupabaseAuthClient | None = None,
    ) -> None:
        self._repository = repository
        self._user_repository = user_repository
        self._auth_client = auth_client or SupabaseAuthClient()

    async def _resolve_actor(self, access_token: str) -> tuple[str, str, list[str]]:
        auth_user = await self._auth_client.fetch_user(access_token)
        user_row = await self._user_repository.find_user_by_auth_user_id(auth_user.auth_user_id)
        if not user_row:
            user_row = await self._user_repository.find_user_by_email(auth_user.email)
        if not user_row:
            raise ForbiddenError("No existe un usuario del sistema asociado a la sesion actual")
        user_id = str(user_row["id"])
        roles = await self._user_repository.list_role_names(user_id)
        return user_id, auth_user.email, roles

    @staticmethod
    def _has_any_role(roles: list[str], allowed: set[str]) -> bool:
        normalized = {role.strip().lower() for role in roles}
        return bool(normalized.intersection(allowed))

    async def list_incidentes(
        self,
        *,
        access_token: str,
        limit: int,
        search: str | None,
        estado: EstadoIncidente | None,
        canal_origen: TipoCanal | None,
        mine: bool,
    ) -> IncidenteListResponse:
        actor_id, _email, roles = await self._resolve_actor(access_token)
        can_view_all = self._has_any_role(roles, {"administrador", "supervisor", "operador"})
        if not can_view_all and not self._has_any_role(roles, {"comunidad"}):
            raise ForbiddenError("No tienes permisos para ver incidentes")

        reportante_id = actor_id if mine or not can_view_all else None
        rows = await self._repository.list_incidentes(
            limit=max(1, min(limit, 100)),
            search=search.strip() if search else None,
            estado=estado,
            canal_origen=canal_origen,
            reportante_id=reportante_id,
        )
        return IncidenteListResponse(items=[IncidenteListItem(**row) for row in rows], total=len(rows))

    async def get_incidente(
        self,
        *,
        access_token: str,
        incidente_id: str,
    ) -> IncidenteDetailResponse:
        actor_id, _email, roles = await self._resolve_actor(access_token)
        detail = await self._repository.get_incidente_detail(incidente_id)
        if not detail:
            raise NotFoundError("No se encontro el incidente solicitado")

        can_view_all = self._has_any_role(roles, {"administrador", "supervisor", "operador"})
        if not can_view_all and str(detail["reportante_id"]) != actor_id:
            raise ForbiddenError("No tienes permisos para ver este incidente")

        historial = await self._repository.list_historial(incidente_id)
        evidencias = await self._repository.list_evidencias(incidente_id)
        ubicaciones = await self._repository.list_ubicaciones(incidente_id)
        return IncidenteDetailResponse(
            **detail,
            historial=historial,
            evidencias=evidencias,
            ubicaciones=ubicaciones,
        )

    async def registrar_incidente(
        self,
        *,
        access_token: str,
        payload: IncidenteCreateRequest,
        ip_origen: str | None,
        user_agent: str | None,
    ) -> IncidenteCreateResponse:
        actor_id, _email, roles = await self._resolve_actor(access_token)
        if not self._has_any_role(roles, {"comunidad", "administrador", "supervisor", "operador"}):
            raise ForbiddenError("No tienes permisos para registrar incidentes")

        descripcion = payload.descripcion.strip()
        if not descripcion:
            raise ValidationError("La descripcion del incidente es obligatoria")

        ubicacion_texto = payload.ubicacion_texto.strip() if payload.ubicacion_texto else None
        latitud = payload.coordenadas.latitude if payload.coordenadas else None
        longitud = payload.coordenadas.longitude if payload.coordenadas else None
        if not ubicacion_texto and (latitud is None or longitud is None):
            raise ValidationError("Debes enviar ubicacion_texto o coordenadas")

        canal_id = await self._repository.get_active_channel_id(payload.canal_origen)
        if not canal_id:
            raise ValidationError(f"El canal {payload.canal_origen.value} no esta habilitado")

        metadata = {
            **payload.metadata_canal,
            "canal_origen": payload.canal_origen.value,
            "correlation_id": payload.correlation_id,
            "categoria": payload.categoria,
            "severidad": payload.severidad.value if payload.severidad else None,
        }
        contenido_raw = json.dumps(
            {
                "descripcion": descripcion,
                "ubicacion_texto": ubicacion_texto,
                "coordenadas": payload.coordenadas.model_dump() if payload.coordenadas else None,
                "evidencias": [evidencia.model_dump() for evidencia in payload.evidencias],
                "metadata_canal": payload.metadata_canal,
                "correlation_id": payload.correlation_id,
            },
            ensure_ascii=False,
        )

        reporte = await self._repository.insert_reporte_entrante(
            canal_id=canal_id,
            contenido_raw=contenido_raw,
            metadatos_canal=metadata,
            ip_origen=ip_origen,
            user_agent=user_agent,
        )
        reporte_id = str(reporte["id"])

        await self._repository.update_reporte_estado(
            reporte_id=reporte_id,
            estado=EstadoReporte.NORMALIZADO,
        )

        related = None
        if payload.correlation_id:
            related = await self._repository.find_incident_by_correlation_id(payload.correlation_id)

        if not related:
            related = await self._repository.find_related_incident(
                categoria=payload.categoria,
                ubicacion_texto=ubicacion_texto,
                latitud=latitud,
                longitud=longitud,
            )

        if related:
            incidente_id = str(related["id"])
            await self._repository.update_reporte_estado(
                reporte_id=reporte_id,
                estado=EstadoReporte.ENRUTADO,
                incidente_id=incidente_id,
                es_correlacionado=True,
            )
            await self._repository.insert_historial(
                incidente_id=incidente_id,
                estado_anterior=EstadoIncidente(str(related["estado"])),
                estado_nuevo=EstadoIncidente(str(related["estado"])),
                accion="REPORTE_CORRELACIONADO",
                comentario="Reporte entrante vinculado a expediente existente",
                ejecutado_por_id=actor_id,
            )
            await self._repository.insert_audit_log(
                usuario_id=actor_id,
                accion="REPORTE_CORRELACIONADO",
                entidad_id=incidente_id,
                detalle={"reporte_entrante_id": reporte_id, "correlation_id": payload.correlation_id},
                ip_origen=ip_origen,
                dispositivo=user_agent,
            )
            return IncidenteCreateResponse(
                message="Tu reporte fue asociado a un incidente existente.",
                incident=IncidenteCreateItem(
                    id=incidente_id,
                    codigo=str(related["codigo"]),
                    estado=EstadoIncidente(str(related["estado"])),
                    canal_origen=TipoCanal(str(related["canal_origen"])),
                    fecha_registro=related["created_at"],
                ),
                reporte_entrante_id=reporte_id,
                es_correlacionado=True,
            )

        now = datetime.now(tz=UTC)
        codigo = await self._repository.next_incident_code(now)
        titulo = _build_title(descripcion, payload.categoria)
        incident = await self._repository.create_incidente(
            codigo=codigo,
            titulo=titulo,
            descripcion=descripcion,
            canal_origen=payload.canal_origen,
            reportante_id=actor_id,
            categoria=payload.categoria,
            severidad=payload.severidad,
            ubicacion_texto=ubicacion_texto,
            latitud=latitud,
            longitud=longitud,
        )
        incidente_id = str(incident["id"])

        await self._repository.update_reporte_estado(
            reporte_id=reporte_id,
            estado=EstadoReporte.ENRUTADO,
            incidente_id=incidente_id,
            es_correlacionado=False,
        )

        if payload.coordenadas:
            await self._repository.insert_ubicacion(
                incidente_id=incidente_id,
                latitud=payload.coordenadas.latitude,
                longitud=payload.coordenadas.longitude,
                fuente=payload.canal_origen.value.lower(),
                precision_metros=payload.coordenadas.precision_metros,
                altitud=payload.coordenadas.altitud,
                descripcion=ubicacion_texto,
            )

        if payload.evidencias:
            await self._repository.insert_evidencias(
                incidente_id=incidente_id,
                evidencias=payload.evidencias,
                cargado_por_id=actor_id,
            )

        await self._repository.insert_historial(
            incidente_id=incidente_id,
            estado_anterior=None,
            estado_nuevo=EstadoIncidente.RECIBIDO,
            accion="REGISTRO_INCIDENTE",
            comentario="Incidente registrado desde reporte entrante",
            ejecutado_por_id=actor_id,
        )
        await self._repository.insert_audit_log(
            usuario_id=actor_id,
            accion="REGISTRO_INCIDENTE",
            entidad_id=incidente_id,
            detalle={
                "canal_origen": payload.canal_origen.value,
                "reporte_entrante_id": reporte_id,
                "correlation_id": payload.correlation_id,
            },
            ip_origen=ip_origen,
            dispositivo=user_agent,
        )

        return IncidenteCreateResponse(
            message="Tu incidente fue registrado correctamente.",
            incident=IncidenteCreateItem(
                id=incidente_id,
                codigo=str(incident["codigo"]),
                estado=EstadoIncidente(str(incident["estado"])),
                canal_origen=TipoCanal(str(incident["canal_origen"])),
                fecha_registro=incident["created_at"],
            ),
            reporte_entrante_id=reporte_id,
            es_correlacionado=False,
        )


def _build_title(descripcion: str, categoria: str | None) -> str:
    prefix = categoria.replace("_", " ").strip().capitalize() if categoria else "Incidente"
    clean = " ".join(descripcion.split())
    if len(clean) > 120:
        clean = f"{clean[:117].rstrip()}..."
    return f"{prefix}: {clean}"[:200]
