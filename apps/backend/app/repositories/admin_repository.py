"""
Repository for the admin module using normalized SQLAlchemy schema models.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import String, cast, delete, func, literal_column, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sc_auditoria import RegistroAuditoria
from app.models.sc_dashboard import EstadoIntegracion
from app.models.sc_users import Permiso, Rol, RolPermiso, Usuario, UsuarioRol


class AdminRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # -----------------------------------------------------------------------
    # Usuarios
    # -----------------------------------------------------------------------

    async def list_usuarios(
        self,
        search: str | None = None,
        estado: str | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        roles_json = func.coalesce(
            func.json_agg(
                func.json_build_object("id", Rol.id, "nombre", Rol.nombre),
            ).filter(Rol.id.is_not(None)),
            literal_column("'[]'::json"),
        ).label("roles")

        statement = (
            select(
                Usuario.id,
                Usuario.nombre,
                Usuario.apellido,
                Usuario.email,
                Usuario.codigo_institucional,
                Usuario.telefono,
                Usuario.departamento,
                Usuario.estado,
                Usuario.avatar_url,
                Usuario.ultimo_acceso,
                Usuario.created_at,
                roles_json,
            )
            .outerjoin(UsuarioRol, UsuarioRol.usuario_id == Usuario.id)
            .outerjoin(Rol, Rol.id == UsuarioRol.rol_id)
            .where(Usuario.deleted_at.is_(None))
            .group_by(Usuario.id)
            .order_by(Usuario.created_at.desc())
            .limit(limit)
        )

        if estado:
            statement = statement.where(Usuario.estado == estado)

        if search:
            pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    Usuario.nombre.ilike(pattern),
                    Usuario.apellido.ilike(pattern),
                    Usuario.email.ilike(pattern),
                )
            )

        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def count_usuarios_por_estado(self) -> dict[str, int]:
        statement = select(
            func.count().filter(Usuario.deleted_at.is_(None)).label("total"),
            func.count()
            .filter(Usuario.estado == "ACTIVO", Usuario.deleted_at.is_(None))
            .label("activos"),
            func.count()
            .filter(Usuario.estado == "INACTIVO", Usuario.deleted_at.is_(None))
            .label("inactivos"),
            func.count()
            .filter(Usuario.estado == "SUSPENDIDO", Usuario.deleted_at.is_(None))
            .label("suspendidos"),
        )
        result = await self.db.execute(statement)
        row = result.mappings().one()
        return {
            "total": int(row["total"]),
            "activos": int(row["activos"]),
            "inactivos": int(row["inactivos"]),
            "suspendidos": int(row["suspendidos"]),
        }

    async def get_usuario_by_email(self, email: str) -> dict[str, Any] | None:
        statement = (
            select(Usuario.id)
            .where(Usuario.email == email, Usuario.deleted_at.is_(None))
            .limit(1)
        )
        result = await self.db.execute(statement)
        row = result.mappings().one_or_none()
        return dict(row) if row else None

    async def create_usuario(self, data: dict[str, Any]) -> str:
        statement = (
            insert(Usuario)
            .values(
                nombre=data["nombre"],
                apellido=data["apellido"],
                email=data["email"],
                codigo_institucional=data.get("codigo_institucional"),
                departamento=data.get("departamento"),
                estado="ACTIVO",
            )
            .returning(Usuario.id)
        )
        result = await self.db.execute(statement)
        return str(result.scalar_one())

    async def assign_rol(self, usuario_id: str, rol_id: str) -> None:
        statement = (
            insert(UsuarioRol)
            .values(usuario_id=UUID(usuario_id), rol_id=UUID(rol_id))
            .on_conflict_do_nothing(
                index_elements=[UsuarioRol.usuario_id, UsuarioRol.rol_id],
            )
        )
        await self.db.execute(statement)

    async def update_usuario(self, usuario_id: str, data: dict[str, Any]) -> None:
        statement = (
            update(Usuario)
            .where(Usuario.id == UUID(usuario_id), Usuario.deleted_at.is_(None))
            .values(
                nombre=data["nombre"],
                apellido=data["apellido"],
                codigo_institucional=data.get("codigo_institucional"),
                departamento=data.get("departamento"),
                updated_at=func.now(),
            )
        )
        await self.db.execute(statement)

    async def replace_rol(self, usuario_id: str, rol_id: str) -> None:
        await self.db.execute(
            delete(UsuarioRol).where(UsuarioRol.usuario_id == UUID(usuario_id))
        )
        await self.assign_rol(usuario_id, rol_id)

    async def update_usuario_profile(self, usuario_id: str, data: dict[str, Any]) -> bool:
        statement = (
            update(Usuario)
            .where(Usuario.id == UUID(usuario_id), Usuario.deleted_at.is_(None))
            .values(
                nombre=data["nombre"],
                apellido=data["apellido"],
                telefono=data.get("telefono"),
                departamento=data.get("departamento"),
                updated_at=func.now(),
            )
            .returning(Usuario.id)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none() is not None

    async def cambiar_estado(self, usuario_id: str, estado: str) -> None:
        statement = (
            update(Usuario)
            .where(Usuario.id == UUID(usuario_id), Usuario.deleted_at.is_(None))
            .values(estado=estado, updated_at=func.now())
        )
        await self.db.execute(statement)

    async def count_admins_activos(self) -> int:
        statement = (
            select(func.count())
            .select_from(Usuario)
            .join(UsuarioRol, UsuarioRol.usuario_id == Usuario.id)
            .join(Rol, Rol.id == UsuarioRol.rol_id)
            .where(
                Usuario.estado == "ACTIVO",
                Usuario.deleted_at.is_(None),
                func.lower(Rol.nombre) == "administrador",
            )
        )
        count = await self.db.scalar(statement)
        return int(count or 0)

    # -----------------------------------------------------------------------
    # Roles & Permisos
    # -----------------------------------------------------------------------

    async def list_roles(self) -> list[dict[str, Any]]:
        permisos_json = func.coalesce(
            func.json_agg(
                func.json_build_object(
                    "id",
                    Permiso.id,
                    "modulo",
                    Permiso.modulo,
                    "accion",
                    Permiso.accion,
                    "descripcion",
                    Permiso.descripcion,
                ),
            ).filter(Permiso.id.is_not(None)),
            literal_column("'[]'::json"),
        ).label("permisos")

        statement = (
            select(
                Rol.id,
                Rol.nombre,
                Rol.descripcion,
                Rol.es_sistema,
                permisos_json,
            )
            .outerjoin(RolPermiso, RolPermiso.rol_id == Rol.id)
            .outerjoin(Permiso, Permiso.id == RolPermiso.permiso_id)
            .group_by(Rol.id)
            .order_by(Rol.nombre)
        )
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def list_permisos(self) -> list[dict[str, Any]]:
        statement = select(
            Permiso.id,
            Permiso.modulo,
            Permiso.accion,
            Permiso.descripcion,
        ).order_by(Permiso.modulo, Permiso.accion)
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def update_permisos_rol(self, rol_id: str, permiso_ids: list[str]) -> None:
        rol_uuid = UUID(rol_id)
        await self.db.execute(delete(RolPermiso).where(RolPermiso.rol_id == rol_uuid))
        if permiso_ids:
            statement = (
                insert(RolPermiso)
                .values(
                    [
                        {"rol_id": rol_uuid, "permiso_id": UUID(permiso_id)}
                        for permiso_id in permiso_ids
                    ]
                )
                .on_conflict_do_nothing(
                    index_elements=[RolPermiso.rol_id, RolPermiso.permiso_id],
                )
            )
            await self.db.execute(statement)

    # -----------------------------------------------------------------------
    # Auditoria
    # -----------------------------------------------------------------------

    async def list_auditoria(
        self,
        search: str | None = None,
        modulo: str | None = None,
        usuario_id: str | None = None,
        desde: str | None = None,
        hasta: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        statement = select(
            RegistroAuditoria.id,
            RegistroAuditoria.usuario_id,
            Usuario.nombre.label("usuario_nombre"),
            Usuario.apellido.label("usuario_apellido"),
            Usuario.email.label("usuario_email"),
            Usuario.avatar_url.label("usuario_avatar_url"),
            RegistroAuditoria.modulo,
            RegistroAuditoria.accion,
            RegistroAuditoria.entidad,
            RegistroAuditoria.entidad_id,
            RegistroAuditoria.detalle,
            RegistroAuditoria.fecha_registro,
        ).outerjoin(
            Usuario,
            Usuario.id == RegistroAuditoria.usuario_id,
        ).order_by(RegistroAuditoria.fecha_registro.desc()).limit(limit)

        if modulo:
            statement = statement.where(RegistroAuditoria.modulo == modulo)
        if usuario_id:
            statement = statement.where(RegistroAuditoria.usuario_id == UUID(usuario_id))
        if search:
            pattern = f"%{search}%"
            statement = statement.where(
                or_(
                    RegistroAuditoria.modulo.ilike(pattern),
                    RegistroAuditoria.accion.ilike(pattern),
                    RegistroAuditoria.entidad.ilike(pattern),
                    cast(RegistroAuditoria.entidad_id, String).ilike(pattern),
                    Usuario.nombre.ilike(pattern),
                    Usuario.apellido.ilike(pattern),
                    Usuario.email.ilike(pattern),
                )
            )
        if desde:
            statement = statement.where(RegistroAuditoria.fecha_registro >= desde)
        if hasta:
            statement = statement.where(RegistroAuditoria.fecha_registro <= hasta)

        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def get_modulos_distintos(self) -> list[str]:
        statement = select(RegistroAuditoria.modulo).distinct().order_by(
            RegistroAuditoria.modulo
        )
        result = await self.db.execute(statement)
        return [row[0] for row in result]

    # -----------------------------------------------------------------------
    # Integraciones
    # -----------------------------------------------------------------------

    async def list_integraciones(self) -> list[dict[str, Any]]:
        statement = select(
            EstadoIntegracion.id,
            EstadoIntegracion.servicio,
            EstadoIntegracion.estado,
            EstadoIntegracion.ultimo_check,
            EstadoIntegracion.tiempo_respuesta_ms,
            EstadoIntegracion.detalle,
            EstadoIntegracion.updated_at,
        ).order_by(EstadoIntegracion.servicio)
        result = await self.db.execute(statement)
        return [dict(row) for row in result.mappings()]

    async def verificar_integracion(self, integracion_id: str) -> bool:
        statement = (
            update(EstadoIntegracion)
            .where(EstadoIntegracion.id == UUID(integracion_id))
            .values(
                estado="DESCONOCIDO",
                ultimo_check=func.now(),
                updated_at=func.now(),
            )
            .returning(EstadoIntegracion.id)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none() is not None
