"""
📁 apps/backend/app/services/admin_service.py
🎯 Lógica de negocio para el módulo de administración.
📦 Capa: Servicios
"""

import base64
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import (
    AuditAccion,
    AuditEntidad,
    AuditModulo,
    AuditOrigen,
    AuditResultado,
)
from app.core.config import settings
from app.core.security import generate_password, get_password_hash
from app.integrations.health import HealthCheckService
from app.repositories.admin_repository import AdminRepository
from app.repositories.auditoria_repository import AuditoriaRepository
from app.schemas.admin import (
    ActualizarPermisosInput,
    AuditoriaAccionesResponse,
    AuditoriaListResponse,
    AuditoriaUsuarioOut,
    AuditoriaUsuarioRef,
    AuditoriaUsuariosResponse,
    CambiarEstadoInput,
    IntegracionesListResponse,
    ModulosResponse,
    PermisoOut,
    PermisosListResponse,
    RegistroAuditoriaOut,
    RolBrief,
    RolesListResponse,
    UsuarioCreateInput,
    UsuarioCreateResponse,
    UsuarioOut,
    UsuarioProfileUpdateInput,
    UsuariosListResponse,
    UsuarioUpdateInput,
)


class AdminService:
    def __init__(
        self,
        db: AsyncSession,
        health: HealthCheckService | None = None,
    ) -> None:
        self._repo = AdminRepository(db)
        self._audit = AuditoriaRepository(db)
        self._health = health or HealthCheckService()

    async def _audit_admin(
        self,
        *,
        actor_id: str | None,
        modulo: str,
        accion: str,
        entidad: str,
        entidad_id: str | None,
        detalle: dict[str, Any],
    ) -> None:
        # Solo registramos auditoría cuando conocemos al actor (acciones desde la
        # web admin). Se inyectan origen/resultado estándar para las columnas de
        # la pantalla de auditoría.
        if not actor_id:
            return
        await self._audit.create_registro(
            usuario_id=actor_id,
            modulo=modulo,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            detalle={
                "origen": AuditOrigen.WEB.value,
                "resultado": AuditResultado.EXITOSO.value,
                **detalle,
            },
        )

    # -----------------------------------------------------------------------
    # Usuarios
    # -----------------------------------------------------------------------

    async def listar_usuarios(
        self,
        search: str | None = None,
        estado: str | None = None,
    ) -> UsuariosListResponse:
        usuarios_rows = await self._repo.list_usuarios(search=search, estado=estado)
        counts = await self._repo.count_usuarios_por_estado()
        items = [self._map_usuario(r) for r in usuarios_rows]
        return UsuariosListResponse(items=items, **counts)

    async def crear_usuario(
        self, data: UsuarioCreateInput, actor_id: str | None = None
    ) -> UsuarioCreateResponse:
        if await self._repo.get_usuario_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un usuario con ese email.",
            )

        # Provisión de contraseña: SOLO cuentas NO institucionales. Las cuentas
        # @pucp.edu.pe se autentican por SSO y nunca reciben password_hash.
        quiere_password = bool(data.password) or data.generar_password
        password_plana: str | None = None
        password_hash: str | None = None
        if quiere_password:
            if data.email.lower().endswith(f"@{settings.ALLOWED_INSTITUTIONAL_DOMAIN}"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Las cuentas institucionales se autentican por SSO y no admiten contraseña."
                    ),
                )
            password_plana = generate_password() if data.generar_password else data.password
            password_hash = get_password_hash(str(password_plana))

        usuario_id = await self._repo.create_usuario(
            {
                "nombre": data.nombre,
                "apellido": data.apellido,
                "email": data.email,
                "codigo_institucional": data.codigo_institucional,
                "departamento": data.departamento,
                "password_hash": password_hash,
            }
        )
        await self._repo.assign_rol(usuario_id, data.rol_id)
        await self._audit_admin(
            actor_id=actor_id,
            modulo=AuditModulo.USUARIOS,
            accion=AuditAccion.CREAR,
            entidad=AuditEntidad.USUARIO,
            entidad_id=usuario_id,
            detalle={
                "codigo_entidad": data.email,
                "resumen": f"Alta de usuario {data.nombre} {data.apellido}",
                "rol_id": data.rol_id,
                "credenciales_asignadas": quiere_password,
            },
        )
        rows = await self._repo.list_usuarios()
        row = next((r for r in rows if str(r["id"]) == usuario_id), None)
        if not row:
            raise HTTPException(status_code=500, detail="Error al recuperar usuario creado.")
        base = self._map_usuario(row)
        return UsuarioCreateResponse(
            **base.model_dump(),
            # Solo se revela cuando fue autogenerada; las manuales ya las conoce el admin.
            password_generada=password_plana if data.generar_password else None,
        )

    async def actualizar_usuario(
        self, usuario_id: str, data: UsuarioUpdateInput, actor_id: str | None = None
    ) -> UsuarioOut:
        await self._repo.update_usuario(
            usuario_id,
            {
                "nombre": data.nombre,
                "apellido": data.apellido,
                "codigo_institucional": data.codigo_institucional,
                "departamento": data.departamento,
            },
        )
        await self._repo.replace_rol(usuario_id, data.rol_id)
        rows = await self._repo.list_usuarios()
        row = next((r for r in rows if str(r["id"]) == usuario_id), None)
        if not row:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        await self._audit_admin(
            actor_id=actor_id,
            modulo=AuditModulo.USUARIOS,
            accion=AuditAccion.EDITAR,
            entidad=AuditEntidad.USUARIO,
            entidad_id=usuario_id,
            detalle={
                "codigo_entidad": row.get("email"),
                "resumen": f"Edición de usuario {data.nombre} {data.apellido}",
                "rol_id": data.rol_id,
            },
        )
        return self._map_usuario(row)

    async def cambiar_estado(
        self, usuario_id: str, data: CambiarEstadoInput, actor_id: str | None = None
    ) -> dict[str, str]:
        rows = await self._repo.list_usuarios()
        usuario = next((r for r in rows if str(r["id"]) == usuario_id), None)
        estado_anterior = usuario.get("estado") if usuario else None
        if data.estado == "SUSPENDIDO":
            count = await self._repo.count_admins_activos()
            # Check if the user being suspended is an admin and the only one
            if usuario:
                roles = usuario.get("roles") or []
                is_admin = any(r.get("nombre", "").lower() == "administrador" for r in roles)
                if is_admin and count <= 1:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="No se puede suspender al único administrador activo.",
                    )
        await self._repo.cambiar_estado(usuario_id, data.estado)
        accion_map = {
            "ACTIVO": AuditAccion.ACTIVAR,
            "SUSPENDIDO": AuditAccion.SUSPENDER,
            "INACTIVO": AuditAccion.DESACTIVAR,
        }
        await self._audit_admin(
            actor_id=actor_id,
            modulo=AuditModulo.USUARIOS,
            accion=accion_map.get(data.estado, AuditAccion.CAMBIAR_ESTADO),
            entidad=AuditEntidad.USUARIO,
            entidad_id=usuario_id,
            detalle={
                "codigo_entidad": usuario.get("email") if usuario else None,
                "before": {"estado": estado_anterior},
                "after": {"estado": data.estado},
            },
        )
        return {"message": "Estado actualizado correctamente."}

    async def actualizar_perfil_usuario(
        self,
        usuario_id: str,
        data: UsuarioProfileUpdateInput,
        actor_id: str | None = None,
    ) -> UsuarioOut:
        updated = await self._repo.update_usuario_profile(
            usuario_id,
            {
                "nombre": data.nombre,
                "apellido": data.apellido,
                "telefono": data.telefono,
                "departamento": data.departamento,
            },
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")

        rows = await self._repo.list_usuarios()
        row = next((item for item in rows if str(item["id"]) == usuario_id), None)
        if not row:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        await self._audit_admin(
            actor_id=actor_id,
            modulo=AuditModulo.USUARIOS,
            accion=AuditAccion.EDITAR,
            entidad=AuditEntidad.USUARIO,
            entidad_id=usuario_id,
            detalle={
                "codigo_entidad": row.get("email"),
                "resumen": f"Edición de perfil de {data.nombre} {data.apellido}",
            },
        )
        return self._map_usuario(row)

    # -----------------------------------------------------------------------
    # Roles & Permisos
    # -----------------------------------------------------------------------

    async def listar_roles(self) -> RolesListResponse:
        rows = await self._repo.list_roles()
        items = []
        for r in rows:
            permisos_raw = r.get("permisos") or []
            if isinstance(permisos_raw, str):
                import json

                permisos_raw = json.loads(permisos_raw)
            items.append(
                {
                    "id": str(r["id"]),
                    "nombre": r["nombre"],
                    "descripcion": r.get("descripcion"),
                    "es_sistema": bool(r.get("es_sistema", False)),
                    "permisos": [self._map_permiso(p) for p in permisos_raw],
                }
            )
        return RolesListResponse(items=items)  # type: ignore[arg-type]

    async def listar_permisos(self) -> PermisosListResponse:
        rows = await self._repo.list_permisos()
        return PermisosListResponse(items=[self._map_permiso(r) for r in rows])

    async def actualizar_permisos_rol(
        self, rol_id: str, data: ActualizarPermisosInput, actor_id: str | None = None
    ) -> dict[str, str]:
        roles = await self._repo.list_roles()
        rol = next((r for r in roles if str(r["id"]) == rol_id), None)
        permisos_antes = []
        if rol:
            permisos_raw = rol.get("permisos") or []
            if isinstance(permisos_raw, str):
                import json

                permisos_raw = json.loads(permisos_raw)
            permisos_antes = [str(p["id"]) for p in permisos_raw]
        await self._repo.update_permisos_rol(rol_id, data.permiso_ids)
        await self._audit_admin(
            actor_id=actor_id,
            modulo=AuditModulo.ROLES,
            accion=AuditAccion.CAMBIAR_ROL,
            entidad=AuditEntidad.ROL,
            entidad_id=rol_id,
            detalle={
                "codigo_entidad": rol.get("nombre") if rol else None,
                "resumen": "Actualización de permisos de rol",
                "before": {"permiso_ids": permisos_antes},
                "after": {"permiso_ids": data.permiso_ids},
            },
        )
        return {"message": "Permisos actualizados correctamente."}

    # -----------------------------------------------------------------------
    # Auditoría
    # -----------------------------------------------------------------------

    async def listar_auditoria(
        self,
        *,
        search: str | None = None,
        modulos: list[str] | None = None,
        acciones: list[str] | None = None,
        usuario_id: str | None = None,
        entidad: str | None = None,
        resultados: list[str] | None = None,
        desde: str | None = None,
        hasta: str | None = None,
        cursor: str | None = None,
        page_size: int = 25,
    ) -> AuditoriaListResponse:
        decoded_cursor = self._decode_cursor(cursor)
        # Pedimos page_size + 1 para detectar has_more sin contar el total.
        rows = await self._repo.list_auditoria(
            search=search,
            modulos=modulos,
            acciones=acciones,
            usuario_id=usuario_id,
            entidad=entidad,
            resultados=resultados,
            desde=desde,
            hasta=hasta,
            cursor=decoded_cursor,
            limit=page_size + 1,
        )
        has_more = len(rows) > page_size
        page_rows = rows[:page_size]
        next_cursor = None
        if has_more and page_rows:
            last = page_rows[-1]
            next_cursor = self._encode_cursor(last["fecha_registro"], last["id"])

        items = [
            RegistroAuditoriaOut(
                id=str(r["id"]),
                usuario_id=str(r["usuario_id"]) if r.get("usuario_id") else None,
                usuario=self._map_auditoria_usuario(r),
                modulo=r["modulo"],
                accion=r["accion"],
                entidad=r.get("entidad"),
                entidad_id=str(r["entidad_id"]) if r.get("entidad_id") else None,
                detalle=r.get("detalle"),
                ip_origen=str(r["ip_origen"]) if r.get("ip_origen") else None,
                dispositivo=r.get("dispositivo"),
                origen=self._detalle_str(r.get("detalle"), "origen"),
                resultado=self._detalle_str(r.get("detalle"), "resultado"),
                fecha_registro=str(r["fecha_registro"]),
            )
            for r in page_rows
        ]
        return AuditoriaListResponse(
            items=items,
            page_size=page_size,
            has_more=has_more,
            next_cursor=next_cursor,
        )

    async def obtener_modulos_distintos(self) -> ModulosResponse:
        modulos = await self._repo.get_modulos_distintos()
        return ModulosResponse(modulos=modulos)

    async def obtener_acciones_distintas(self) -> AuditoriaAccionesResponse:
        acciones = await self._repo.get_acciones_distintas()
        return AuditoriaAccionesResponse(acciones=acciones)

    async def obtener_usuarios_auditoria(self) -> AuditoriaUsuariosResponse:
        rows = await self._repo.get_usuarios_auditoria()
        usuarios = [
            AuditoriaUsuarioRef(
                id=str(r["id"]),
                nombre_completo=(
                    f"{(r.get('nombre') or '').strip()} {(r.get('apellido') or '').strip()}"
                ).strip()
                or "Usuario",
                email=r.get("email"),
            )
            for r in rows
        ]
        return AuditoriaUsuariosResponse(usuarios=usuarios)

    @staticmethod
    def _detalle_str(detalle: Any, key: str) -> str | None:
        if isinstance(detalle, dict):
            value = detalle.get(key)
            if isinstance(value, str):
                return value
        return None

    @staticmethod
    def _encode_cursor(fecha_registro: Any, registro_id: Any) -> str:
        raw = f"{fecha_registro.isoformat()}|{registro_id}"
        return base64.urlsafe_b64encode(raw.encode()).decode()

    @staticmethod
    def _decode_cursor(cursor: str | None) -> tuple[datetime, UUID] | None:
        if not cursor:
            return None
        try:
            raw = base64.urlsafe_b64decode(cursor.encode()).decode()
            fecha_str, id_str = raw.split("|", 1)
            return datetime.fromisoformat(fecha_str), UUID(id_str)
        except (ValueError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cursor de paginación inválido.",
            ) from exc

    # -----------------------------------------------------------------------
    # Integraciones
    # -----------------------------------------------------------------------

    async def listar_integraciones(self) -> IntegracionesListResponse:
        rows = await self._repo.list_integraciones()
        items = [
            {
                "id": str(r["id"]),
                "servicio": r["servicio"],
                "estado": r["estado"],
                "ultimo_check": str(r["ultimo_check"]) if r.get("ultimo_check") else None,
                "tiempo_respuesta_ms": r.get("tiempo_respuesta_ms"),
                "detalle": r.get("detalle"),
                "updated_at": str(r["updated_at"]),
            }
            for r in rows
        ]
        return IntegracionesListResponse(items=items)  # type: ignore[arg-type]

    async def verificar_integracion(self, integracion_id: str) -> dict[str, str]:
        integracion = await self._repo.get_integracion(integracion_id)
        if not integracion:
            raise HTTPException(status_code=404, detail="Integración no encontrada.")

        resultado = await self._health.check(integracion["servicio"])
        await self._repo.guardar_resultado_check(
            integracion_id,
            estado=resultado.estado,
            tiempo_respuesta_ms=resultado.tiempo_respuesta_ms,
            detalle=resultado.detalle or None,
        )
        return {"message": f"Verificación completada: {resultado.estado}."}

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _map_auditoria_usuario(r: dict[str, Any]) -> AuditoriaUsuarioOut | None:
        usuario_id = r.get("usuario_id")
        if not usuario_id:
            return None
        nombre = str(r.get("usuario_nombre") or "").strip()
        apellido = str(r.get("usuario_apellido") or "").strip()
        nombre_completo = f"{nombre} {apellido}".strip() or "Usuario"
        return AuditoriaUsuarioOut(
            id=str(usuario_id),
            nombre_completo=nombre_completo,
            email=r.get("usuario_email"),
            avatar_url=r.get("usuario_avatar_url"),
        )

    @staticmethod
    def _map_usuario(r: dict[str, Any]) -> UsuarioOut:
        import json

        roles_raw = r.get("roles") or []
        if isinstance(roles_raw, str):
            roles_raw = json.loads(roles_raw)

        return UsuarioOut(
            id=str(r["id"]),
            nombre=r["nombre"],
            apellido=r["apellido"],
            email=r["email"],
            codigo_institucional=r.get("codigo_institucional"),
            telefono=r.get("telefono"),
            departamento=r.get("departamento"),
            estado=r["estado"],
            avatar_url=r.get("avatar_url"),
            ultimo_acceso=str(r["ultimo_acceso"]) if r.get("ultimo_acceso") else None,
            created_at=str(r["created_at"]),
            roles=[RolBrief(id=str(role["id"]), nombre=role["nombre"]) for role in roles_raw],
        )

    @staticmethod
    def _map_permiso(r: dict[str, Any]) -> PermisoOut:
        return PermisoOut(
            id=str(r["id"]),
            modulo=r["modulo"],
            accion=r["accion"],
            descripcion=r.get("descripcion"),
        )
