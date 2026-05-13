"""
📁 apps/backend/app/services/admin_service.py
🎯 Lógica de negocio para el módulo de administración.
📦 Capa: Servicios
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_repository import AdminRepository
from app.schemas.admin import (
    ActualizarPermisosInput,
    AuditoriaListResponse,
    AuditoriaUsuarioOut,
    CambiarEstadoInput,
    IntegracionesListResponse,
    ModulosResponse,
    PermisosListResponse,
    RegistroAuditoriaOut,
    RolesListResponse,
    UsuarioCreateInput,
    UsuarioOut,
    UsuarioUpdateInput,
    UsuariosListResponse,
)


class AdminService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = AdminRepository(db)

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

    async def crear_usuario(self, data: UsuarioCreateInput) -> UsuarioOut:
        if await self._repo.get_usuario_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un usuario con ese email.",
            )
        usuario_id = await self._repo.create_usuario(
            {
                "nombre": data.nombre,
                "apellido": data.apellido,
                "email": data.email,
                "codigo_institucional": data.codigo_institucional,
                "departamento": data.departamento,
            }
        )
        await self._repo.assign_rol(usuario_id, data.rol_id)
        rows = await self._repo.list_usuarios()
        row = next((r for r in rows if str(r["id"]) == usuario_id), None)
        if not row:
            raise HTTPException(status_code=500, detail="Error al recuperar usuario creado.")
        return self._map_usuario(row)

    async def actualizar_usuario(
        self, usuario_id: str, data: UsuarioUpdateInput
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
        return self._map_usuario(row)

    async def cambiar_estado(
        self, usuario_id: str, data: CambiarEstadoInput
    ) -> dict[str, str]:
        if data.estado == "SUSPENDIDO":
            count = await self._repo.count_admins_activos()
            # Check if the user being suspended is an admin and the only one
            rows = await self._repo.list_usuarios()
            usuario = next((r for r in rows if str(r["id"]) == usuario_id), None)
            if usuario:
                roles = usuario.get("roles") or []
                is_admin = any(
                    r.get("nombre", "").lower() == "administrador" for r in roles
                )
                if is_admin and count <= 1:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="No se puede suspender al único administrador activo.",
                    )
        await self._repo.cambiar_estado(usuario_id, data.estado)
        return {"message": "Estado actualizado correctamente."}

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
        self, rol_id: str, data: ActualizarPermisosInput
    ) -> dict[str, str]:
        await self._repo.update_permisos_rol(rol_id, data.permiso_ids)
        return {"message": "Permisos actualizados correctamente."}

    # -----------------------------------------------------------------------
    # Auditoría
    # -----------------------------------------------------------------------

    async def listar_auditoria(
        self,
        search: str | None = None,
        modulo: str | None = None,
        usuario_id: str | None = None,
        desde: str | None = None,
        hasta: str | None = None,
        limit: int = 100,
    ) -> AuditoriaListResponse:
        rows = await self._repo.list_auditoria(
            search=search,
            modulo=modulo,
            usuario_id=usuario_id,
            desde=desde,
            hasta=hasta,
            limit=limit,
        )
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
                fecha_registro=str(r["fecha_registro"]),
            )
            for r in rows
        ]
        return AuditoriaListResponse(items=items, total=len(items))

    async def obtener_modulos_distintos(self) -> ModulosResponse:
        modulos = await self._repo.get_modulos_distintos()
        return ModulosResponse(modulos=modulos)

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
        found = await self._repo.verificar_integracion(integracion_id)
        if not found:
            raise HTTPException(status_code=404, detail="Integración no encontrada.")
        return {"message": "Verificación iniciada."}

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _map_auditoria_usuario(r: dict) -> AuditoriaUsuarioOut | None:
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
    def _map_usuario(r: dict) -> UsuarioOut:
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
            departamento=r.get("departamento"),
            estado=r["estado"],
            avatar_url=r.get("avatar_url"),
            ultimo_acceso=str(r["ultimo_acceso"]) if r.get("ultimo_acceso") else None,
            created_at=str(r["created_at"]),
            roles=[
                {
                    "id": str(role["id"]),
                    "nombre": role["nombre"],
                }
                for role in roles_raw
            ],
        )

    @staticmethod
    def _map_permiso(r: dict) -> dict[str, str | None]:
        return {
            "id": str(r["id"]),
            "modulo": r["modulo"],
            "accion": r["accion"],
            "descripcion": r.get("descripcion"),
        }
