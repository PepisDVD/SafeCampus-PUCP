from __future__ import annotations

from time import perf_counter
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.integrations.supabase_auth import SupabaseAuthClient
from app.repositories.admin_repository import AdminRepository
from app.repositories.user_sync_repository import UserSyncRepository
from app.schemas.admin import (
    AdminActionResponse,
    AdminAuditLogItem,
    AdminAuditLogsListResponse,
    AdminIntegrationItem,
    AdminIntegrationsListResponse,
    AdminIntegrationVerifyResponse,
    AdminPermissionItem,
    AdminPermissionsListResponse,
    AdminRoleCreateRequest,
    AdminRoleItem,
    AdminRolesListResponse,
    AdminRoleUpdateRequest,
    AdminUserCreateRequest,
    AdminUserItem,
    AdminUsersListResponse,
    AdminUserUpdateRequest,
    RolePermissionItem,
    RolePermissionsListResponse,
)


INTEGRATION_CATALOG: dict[str, dict[str, str]] = {
    "openai_api": {
        "nombre": "OpenAI API",
        "descripcion": "Clasificacion automatica de incidentes y sugerencias de triage.",
        "categoria": "ia",
    },
    "whatsapp_gateway": {
        "nombre": "WhatsApp Business API",
        "descripcion": "Canal omnicanal de reportes y alertas hacia la comunidad.",
        "categoria": "mensajeria",
    },
    "google_maps": {
        "nombre": "Google Maps Platform",
        "descripcion": "Mapas y geocodificacion para analitica georreferenciada.",
        "categoria": "mapas",
    },
    "gmail_oauth": {
        "nombre": "Gmail OAuth2",
        "descripcion": "Integracion de correo institucional para autenticacion y notificaciones.",
        "categoria": "correo",
    },
    "push_notifications": {
        "nombre": "Push Notifications",
        "descripcion": "Canal de notificaciones push para aplicaciones cliente.",
        "categoria": "autenticacion",
    },
}


class AdminService:
    def __init__(
        self,
        *,
        admin_repository: AdminRepository,
        user_sync_repository: UserSyncRepository,
        auth_client: SupabaseAuthClient | None = None,
    ) -> None:
        self._admin_repository = admin_repository
        self._user_sync_repository = user_sync_repository
        self._auth_client = auth_client or SupabaseAuthClient()

    async def _resolve_actor_user_id(self, access_token: str) -> str:
        auth_user = await self._auth_client.fetch_user(access_token)
        user_row = await self._user_sync_repository.find_user_by_auth_user_id(auth_user.auth_user_id)
        if not user_row:
            user_row = await self._user_sync_repository.find_user_by_email(auth_user.email)
        if not user_row:
            raise ForbiddenError("No existe una cuenta interna asociada a la sesión")
        return str(user_row["id"])

    async def _require_admin(self, access_token: str) -> str:
        user_id = await self._resolve_actor_user_id(access_token)
        roles = await self._user_sync_repository.list_role_names(user_id)
        if "administrador" not in roles:
            raise ForbiddenError("Se requiere rol administrador para esta operación")
        return user_id

    async def _ensure_admin_role_full_permissions(self) -> None:
        admin_role = await self._admin_repository.find_role_by_name("administrador")
        if not admin_role:
            return

        permission_ids = await self._admin_repository.list_permission_ids()
        await self._admin_repository.replace_role_permissions(
            role_id=str(admin_role["id"]),
            permission_ids=permission_ids,
        )

    async def _audit(
        self,
        *,
        actor_user_id: str,
        accion: str,
        modulo: str,
        tipo_evento: str,
        descripcion: str,
        entidad: str | None = None,
        entidad_id: str | None = None,
        ip_origen: str | None = None,
        dispositivo: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        detail_payload: dict[str, Any] = {
            "tipo_evento": tipo_evento,
            "descripcion": descripcion,
        }
        if extra:
            detail_payload.update(extra)

        await self._admin_repository.insert_audit_log(
            usuario_id=actor_user_id,
            accion=accion,
            modulo=modulo,
            entidad=entidad,
            entidad_id=entidad_id,
            detalle=detail_payload,
            ip_origen=ip_origen,
            dispositivo=dispositivo,
        )

    @staticmethod
    def _map_estado_integracion(raw_estado: str) -> str:
        normalized = raw_estado.strip().upper()
        if normalized == "OK":
            return "operativo"
        if normalized == "DEGRADADO":
            return "degradado"
        if normalized in {"CAIDO", "DESCONOCIDO"}:
            return "inactivo"
        return "inactivo"

    def _to_integration_item(self, row: dict[str, Any]) -> AdminIntegrationItem:
        servicio = str(row["servicio"])
        catalog = INTEGRATION_CATALOG.get(servicio)
        detail = row.get("detalle") if isinstance(row.get("detalle"), dict) else {}

        return AdminIntegrationItem(
            id=str(row["id"]),
            servicio=servicio,
            nombre=(catalog or {}).get("nombre", servicio),
            descripcion=(catalog or {}).get("descripcion", "Sin descripcion"),
            categoria=(catalog or {}).get("categoria", "autenticacion"),
            estado=self._map_estado_integracion(str(row.get("estado", "DESCONOCIDO"))),
            ultima_verificacion=row.get("ultimo_check"),
            latencia_ms=row.get("tiempo_respuesta_ms"),
            mensaje_estado=str(detail.get("mensaje") or "Sin verificacion reciente"),
            detalle=detail,
        )

    async def list_users(self, *, access_token: str) -> AdminUsersListResponse:
        await self._require_admin(access_token)
        rows = await self._admin_repository.list_users()

        items = [
            AdminUserItem(
                id=str(row["id"]),
                email=row["email"],
                nombre=row["nombre"],
                apellido=row["apellido"],
                codigo_institucional=row.get("codigo_institucional"),
                departamento=row.get("departamento"),
                estado=str(row["estado"]).lower(),
                ultimo_acceso=row.get("ultimo_acceso"),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                roles=[str(role) for role in (row.get("roles") or [])],
            )
            for row in rows
        ]
        return AdminUsersListResponse(items=items, total=len(items))

    async def create_user(
        self,
        *,
        access_token: str,
        payload: AdminUserCreateRequest,
    ) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)

        email = payload.email.strip().lower()
        if await self._admin_repository.exists_user_by_email(email):
            raise ConflictError("Ya existe un usuario con ese correo")

        codigo = payload.codigo_institucional.strip() if payload.codigo_institucional else None
        if codigo and await self._admin_repository.exists_user_by_codigo(codigo):
            raise ConflictError("Ya existe un usuario con ese código institucional")

        normalized_estado = payload.estado.strip().upper()
        if normalized_estado not in {"ACTIVO", "INACTIVO", "SUSPENDIDO"}:
            raise ValidationError("El estado debe ser activo, inactivo o suspendido")

        user_id = await self._admin_repository.create_user(
            email=email,
            nombre=payload.nombre.strip(),
            apellido=payload.apellido.strip(),
            codigo_institucional=codigo,
            departamento=payload.departamento.strip() if payload.departamento else None,
            estado=normalized_estado,
        )

        if payload.role_ids:
            await self._admin_repository.replace_user_roles(user_id=user_id, role_ids=payload.role_ids)

        await self._audit(
            actor_user_id=actor_user_id,
            accion="crear_usuario",
            modulo="usuarios",
            tipo_evento="usuario_creado",
            descripcion=f"Se creo el usuario {email}",
            entidad="usuario",
            entidad_id=user_id,
            extra={"roles": payload.role_ids},
        )

        return AdminActionResponse(message="Usuario creado correctamente")

    async def update_user(
        self,
        *,
        access_token: str,
        user_id: str,
        payload: AdminUserUpdateRequest,
    ) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)

        existing = await self._admin_repository.find_user_by_id(user_id)
        if not existing:
            raise NotFoundError("Usuario no encontrado")

        normalized_email = payload.email.strip().lower() if payload.email else None
        if normalized_email and await self._admin_repository.exists_user_by_email(
            normalized_email,
            exclude_user_id=user_id,
        ):
            raise ConflictError("Ya existe un usuario con ese correo")

        normalized_codigo = payload.codigo_institucional.strip() if payload.codigo_institucional else None
        if normalized_codigo and await self._admin_repository.exists_user_by_codigo(
            normalized_codigo,
            exclude_user_id=user_id,
        ):
            raise ConflictError("Ya existe un usuario con ese código institucional")

        normalized_estado = payload.estado.strip().upper() if payload.estado else None
        if normalized_estado and normalized_estado not in {"ACTIVO", "INACTIVO", "SUSPENDIDO"}:
            raise ValidationError("El estado debe ser activo, inactivo o suspendido")

        await self._admin_repository.update_user(
            user_id=user_id,
            email=normalized_email,
            nombre=payload.nombre.strip() if payload.nombre else None,
            apellido=payload.apellido.strip() if payload.apellido else None,
            codigo_institucional=normalized_codigo,
            departamento=payload.departamento.strip() if payload.departamento else None,
            estado=normalized_estado,
        )

        if payload.role_ids is not None:
            await self._admin_repository.replace_user_roles(user_id=user_id, role_ids=payload.role_ids)

        await self._audit(
            actor_user_id=actor_user_id,
            accion="editar_usuario",
            modulo="usuarios",
            tipo_evento="usuario_editado",
            descripcion=f"Se actualizo el usuario {existing['email']}",
            entidad="usuario",
            entidad_id=user_id,
            extra={"fields": payload.model_dump(exclude_none=True)},
        )

        return AdminActionResponse(message="Usuario actualizado correctamente")

    async def suspend_user(self, *, access_token: str, user_id: str) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)
        existing = await self._admin_repository.find_user_by_id(user_id)
        if not existing:
            raise NotFoundError("Usuario no encontrado")
        await self._admin_repository.set_user_estado(user_id=user_id, estado="SUSPENDIDO")

        await self._audit(
            actor_user_id=actor_user_id,
            accion="suspender_usuario",
            modulo="usuarios",
            tipo_evento="usuario_suspendido",
            descripcion=f"Se suspendio el usuario {existing['email']}",
            entidad="usuario",
            entidad_id=user_id,
        )
        return AdminActionResponse(message="Usuario suspendido correctamente")

    async def reactivate_user(self, *, access_token: str, user_id: str) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)
        existing = await self._admin_repository.find_user_by_id(user_id)
        if not existing:
            raise NotFoundError("Usuario no encontrado")
        await self._admin_repository.set_user_estado(user_id=user_id, estado="ACTIVO")

        await self._audit(
            actor_user_id=actor_user_id,
            accion="reactivar_usuario",
            modulo="usuarios",
            tipo_evento="usuario_reactivado",
            descripcion=f"Se reactivo el usuario {existing['email']}",
            entidad="usuario",
            entidad_id=user_id,
        )
        return AdminActionResponse(message="Usuario reactivado correctamente")

    async def list_roles(self, *, access_token: str) -> AdminRolesListResponse:
        await self._require_admin(access_token)
        rows = await self._admin_repository.list_roles()
        items = [
            AdminRoleItem(
                id=str(row["id"]),
                nombre=row["nombre"],
                descripcion=row.get("descripcion"),
                es_sistema=bool(row["es_sistema"]),
                permissions_count=int(row["permissions_count"]),
            )
            for row in rows
        ]
        return AdminRolesListResponse(items=items, total=len(items))

    async def create_role(
        self,
        *,
        access_token: str,
        payload: AdminRoleCreateRequest,
    ) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)
        nombre = payload.nombre.strip().lower()
        if await self._admin_repository.exists_role_by_name(nombre):
            raise ConflictError("Ya existe un rol con ese nombre")

        role_id = await self._admin_repository.create_role(nombre=nombre, descripcion=payload.descripcion)

        await self._audit(
            actor_user_id=actor_user_id,
            accion="crear_rol",
            modulo="roles",
            tipo_evento="rbac_modificado",
            descripcion=f"Se creo el rol {nombre}",
            entidad="rol",
            entidad_id=role_id,
        )
        return AdminActionResponse(message="Rol creado correctamente")

    async def update_role(
        self,
        *,
        access_token: str,
        role_id: str,
        payload: AdminRoleUpdateRequest,
    ) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)
        role = await self._admin_repository.find_role_by_id(role_id)
        if not role:
            raise NotFoundError("Rol no encontrado")

        new_name = payload.nombre.strip().lower() if payload.nombre else None
        if new_name and await self._admin_repository.exists_role_by_name(new_name, exclude_role_id=role_id):
            raise ConflictError("Ya existe un rol con ese nombre")

        await self._admin_repository.update_role(
            role_id=role_id,
            nombre=new_name,
            descripcion=payload.descripcion,
        )

        await self._audit(
            actor_user_id=actor_user_id,
            accion="editar_rol",
            modulo="roles",
            tipo_evento="rbac_modificado",
            descripcion=f"Se actualizo el rol {role['nombre']}",
            entidad="rol",
            entidad_id=role_id,
            extra={"fields": payload.model_dump(exclude_none=True)},
        )
        return AdminActionResponse(message="Rol actualizado correctamente")

    async def delete_role(self, *, access_token: str, role_id: str) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)
        role = await self._admin_repository.find_role_by_id(role_id)
        if not role:
            raise NotFoundError("Rol no encontrado")
        if role["es_sistema"]:
            raise ForbiddenError("No se puede eliminar un rol del sistema")

        users_count = await self._admin_repository.count_role_users(role_id)
        if users_count > 0:
            raise ConflictError("No se puede eliminar un rol asignado a usuarios")

        await self._admin_repository.delete_role(role_id)

        await self._audit(
            actor_user_id=actor_user_id,
            accion="eliminar_rol",
            modulo="roles",
            tipo_evento="rbac_modificado",
            descripcion=f"Se elimino el rol {role['nombre']}",
            entidad="rol",
            entidad_id=role_id,
        )
        return AdminActionResponse(message="Rol eliminado correctamente")

    async def list_permissions(self, *, access_token: str) -> AdminPermissionsListResponse:
        await self._require_admin(access_token)
        rows = await self._admin_repository.list_permissions()
        items = [
            AdminPermissionItem(
                id=str(row["id"]),
                modulo=row["modulo"],
                accion=row["accion"],
                descripcion=row.get("descripcion"),
            )
            for row in rows
        ]
        return AdminPermissionsListResponse(items=items, total=len(items))

    async def list_role_permissions(self, *, access_token: str) -> RolePermissionsListResponse:
        await self._require_admin(access_token)
        rows = await self._admin_repository.list_role_permissions()
        items = [
            RolePermissionItem(
                role_id=str(row["rol_id"]),
                permission_id=str(row["permiso_id"]),
            )
            for row in rows
        ]
        return RolePermissionsListResponse(items=items)

    async def replace_role_permissions(
        self,
        *,
        access_token: str,
        role_id: str,
        permission_ids: list[str],
    ) -> AdminActionResponse:
        actor_user_id = await self._require_admin(access_token)
        await self._ensure_admin_role_full_permissions()
        role = await self._admin_repository.find_role_by_id(role_id)
        if not role:
            raise NotFoundError("Rol no encontrado")

        final_permission_ids = permission_ids
        if str(role["nombre"]).strip().lower() == "administrador":
            final_permission_ids = await self._admin_repository.list_permission_ids()

        await self._admin_repository.replace_role_permissions(
            role_id=role_id,
            permission_ids=final_permission_ids,
        )

        await self._audit(
            actor_user_id=actor_user_id,
            accion="actualizar_rol_permisos",
            modulo="roles",
            tipo_evento="rbac_modificado",
            descripcion=f"Se actualizaron permisos del rol {role['nombre']}",
            entidad="rol",
            entidad_id=role_id,
            extra={"permissions_count": len(final_permission_ids)},
        )
        return AdminActionResponse(message="Permisos del rol actualizados")

    async def list_integrations(self, *, access_token: str) -> AdminIntegrationsListResponse:
        await self._require_admin(access_token)
        await self._admin_repository.ensure_integrations_exist(
            service_names=list(INTEGRATION_CATALOG.keys()),
        )
        rows = await self._admin_repository.list_integrations()
        items = [self._to_integration_item(row) for row in rows if row.get("servicio") in INTEGRATION_CATALOG]
        return AdminIntegrationsListResponse(items=items, total=len(items))

    async def verify_integration(
        self,
        *,
        access_token: str,
        service_name: str,
        ip_origen: str | None,
        dispositivo: str | None,
    ) -> AdminIntegrationVerifyResponse:
        actor_user_id = await self._require_admin(access_token)
        normalized_service = service_name.strip().lower()
        if normalized_service not in INTEGRATION_CATALOG:
            raise NotFoundError("Integracion no soportada")

        await self._admin_repository.ensure_integrations_exist(service_names=[normalized_service])
        current_row = await self._admin_repository.find_integration_by_service(normalized_service)
        if not current_row:
            raise NotFoundError("Integracion no encontrada")

        check_result = await self._run_integration_check(normalized_service)
        await self._admin_repository.update_integration_status(
            service_name=normalized_service,
            estado=check_result["db_status"],
            tiempo_respuesta_ms=check_result["latency_ms"],
            detalle=check_result["detail"],
        )

        updated_row = await self._admin_repository.find_integration_by_service(normalized_service)
        if not updated_row:
            raise NotFoundError("Integracion no encontrada")

        event_type = "integracion_verificada" if check_result["db_status"] == "OK" else "integracion_alerta"
        await self._audit(
            actor_user_id=actor_user_id,
            accion="verificar_integracion",
            modulo="integraciones",
            tipo_evento=event_type,
            descripcion=f"Se verifico la integracion {normalized_service}: {check_result['detail'].get('mensaje', '')}",
            entidad="estado_integracion",
            entidad_id=str(updated_row["id"]),
            ip_origen=ip_origen,
            dispositivo=dispositivo,
            extra={"servicio": normalized_service},
        )

        return AdminIntegrationVerifyResponse(
            message="Integracion verificada correctamente",
            item=self._to_integration_item(updated_row),
        )

    async def list_audit_logs(
        self,
        *,
        access_token: str,
        limit: int,
        search: str | None,
        event_type: str | None,
        modulo: str | None,
        desde: str | None,
        hasta: str | None,
    ) -> AdminAuditLogsListResponse:
        await self._require_admin(access_token)
        rows = await self._admin_repository.list_audit_logs(
            limit=limit,
            search=search,
            event_type=event_type,
            modulo=modulo,
            desde=desde,
            hasta=hasta,
        )

        items: list[AdminAuditLogItem] = []
        for row in rows:
            actor_name = " ".join(
                part.strip()
                for part in [str(row.get("nombre") or "").strip(), str(row.get("apellido") or "").strip()]
                if part and part.strip()
            ).strip()
            actor = actor_name or str(row.get("email") or "Sistema")

            detalle = str(row.get("detalle_descripcion") or "").strip()
            if not detalle:
                detalle = str((row.get("detalle") or {}).get("mensaje") or "Sin detalle")

            items.append(
                AdminAuditLogItem(
                    id=str(row["id"]),
                    tipo=str(row.get("tipo_evento") or "otro"),
                    actor=actor,
                    accion=str(row.get("accion") or "sin_accion"),
                    detalle=detalle,
                    timestamp=row["fecha_registro"],
                    modulo=str(row.get("modulo") or "sistema"),
                    entidad=str(row.get("entidad")) if row.get("entidad") else None,
                    entidad_id=str(row.get("entidad_id")) if row.get("entidad_id") else None,
                    ip_origen=str(row.get("ip_origen")) if row.get("ip_origen") else None,
                    dispositivo=str(row.get("dispositivo")) if row.get("dispositivo") else None,
                ),
            )

        return AdminAuditLogsListResponse(items=items, total=len(items), limit=limit)

    async def _run_integration_check(self, service_name: str) -> dict[str, Any]:
        start = perf_counter()
        detail: dict[str, Any]

        if service_name == "openai_api":
            detail = await self._check_openai()
        elif service_name == "whatsapp_gateway":
            detail = await self._check_whatsapp()
        elif service_name == "google_maps":
            detail = await self._check_google_maps()
        elif service_name == "gmail_oauth":
            detail = await self._check_gmail_oauth()
        else:
            detail = await self._check_push_notifications()

        latency_ms = int((perf_counter() - start) * 1000)
        detail["latency_ms"] = latency_ms

        state = str(detail.get("state") or "DESCONOCIDO").upper()
        if state not in {"OK", "DEGRADADO", "CAIDO", "DESCONOCIDO"}:
            state = "DESCONOCIDO"

        return {
            "db_status": state,
            "latency_ms": latency_ms,
            "detail": detail,
        }

    async def _check_openai(self) -> dict[str, Any]:
        if not settings.OPENAI_API_KEY.strip():
            return {"state": "CAIDO", "mensaje": "OPENAI_API_KEY no configurada"}

        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}"}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get("https://api.openai.com/v1/models", headers=headers)
            if response.status_code == 200:
                return {"state": "OK", "mensaje": "OpenAI API responde correctamente"}
            return {"state": "DEGRADADO", "mensaje": f"OpenAI devolvio {response.status_code}"}
        except Exception as exc:
            return {"state": "CAIDO", "mensaje": f"No se pudo conectar a OpenAI: {exc}"}

    async def _check_whatsapp(self) -> dict[str, Any]:
        token = settings.WHATSAPP_TOKEN.strip()
        phone_id = settings.WHATSAPP_PHONE_ID.strip()
        if not token or not phone_id:
            return {"state": "CAIDO", "mensaje": "WHATSAPP_TOKEN/WHATSAPP_PHONE_ID no configurados"}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(
                    f"https://graph.facebook.com/v20.0/{phone_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
            if response.status_code == 200:
                return {"state": "OK", "mensaje": "WhatsApp Business API operativa"}
            return {"state": "DEGRADADO", "mensaje": f"WhatsApp devolvio {response.status_code}"}
        except Exception as exc:
            return {"state": "CAIDO", "mensaje": f"No se pudo conectar a WhatsApp: {exc}"}

    async def _check_google_maps(self) -> dict[str, Any]:
        key = settings.GOOGLE_MAPS_API_KEY.strip()
        if not key:
            return {"state": "CAIDO", "mensaje": "GOOGLE_MAPS_API_KEY no configurada"}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(
                    "https://maps.googleapis.com/maps/api/geocode/json",
                    params={"address": "PUCP", "key": key},
                )
            if response.status_code == 200:
                status = (response.json() or {}).get("status")
                if status in {"OK", "ZERO_RESULTS"}:
                    return {"state": "OK", "mensaje": "Google Maps API operativa"}
                return {"state": "DEGRADADO", "mensaje": f"Google Maps status={status}"}
            return {"state": "DEGRADADO", "mensaje": f"Google Maps devolvio {response.status_code}"}
        except Exception as exc:
            return {"state": "CAIDO", "mensaje": f"No se pudo conectar a Google Maps: {exc}"}

    async def _check_gmail_oauth(self) -> dict[str, Any]:
        has_client = bool(settings.GOOGLE_CLIENT_ID.strip())
        has_secret = bool(settings.GOOGLE_CLIENT_SECRET.strip())
        if has_client and has_secret:
            return {"state": "OK", "mensaje": "Google OAuth2 configurado correctamente"}
        if has_client or has_secret:
            return {"state": "DEGRADADO", "mensaje": "Configuracion OAuth2 incompleta"}
        return {"state": "CAIDO", "mensaje": "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET no configurados"}

    async def _check_push_notifications(self) -> dict[str, Any]:
        return {"state": "DESCONOCIDO", "mensaje": "Canal push pendiente de configuracion"}
