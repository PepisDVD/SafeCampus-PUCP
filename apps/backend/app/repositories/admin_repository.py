from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AdminRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def find_user_for_profile(self, *, user_id: str) -> dict[str, Any] | None:
        query = text(
            """
            SELECT
                id,
                email,
                nombre,
                apellido,
                codigo_institucional,
                departamento,
                telefono,
                avatar_url,
                estado,
                email_verificado,
                ultimo_acceso,
                created_at,
                updated_at
            FROM sc_users.usuario
            WHERE id = CAST(:user_id AS uuid)
              AND deleted_at IS NULL
            LIMIT 1
            """,
        )
        result = await self._db.execute(query, {"user_id": user_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def list_users(self) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT
                u.id,
                u.email,
                u.nombre,
                u.apellido,
                u.codigo_institucional,
                u.departamento,
                u.estado,
                u.ultimo_acceso,
                u.created_at,
                u.updated_at,
                COALESCE(
                    ARRAY_AGG(r.nombre ORDER BY r.nombre)
                        FILTER (WHERE r.nombre IS NOT NULL),
                    ARRAY[]::varchar[]
                ) AS roles
            FROM sc_users.usuario u
            LEFT JOIN sc_users.usuario_rol ur ON ur.usuario_id = u.id
            LEFT JOIN sc_users.rol r ON r.id = ur.rol_id
            WHERE u.deleted_at IS NULL
            GROUP BY
                u.id,
                u.email,
                u.nombre,
                u.apellido,
                u.codigo_institucional,
                u.departamento,
                u.estado,
                u.ultimo_acceso,
                u.created_at,
                u.updated_at
            ORDER BY u.created_at DESC
            """,
        )
        result = await self._db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def find_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        query = text(
            """
            SELECT id, email, nombre, apellido, codigo_institucional, departamento, estado
            FROM sc_users.usuario
            WHERE id = CAST(:user_id AS uuid)
              AND deleted_at IS NULL
            LIMIT 1
            """,
        )
        result = await self._db.execute(query, {"user_id": user_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def exists_user_by_email(self, email: str, *, exclude_user_id: str | None = None) -> bool:
        params: dict[str, Any] = {"email": email}
        query_sql = """
            SELECT 1
            FROM sc_users.usuario
            WHERE email = :email
              AND deleted_at IS NULL
        """
        if exclude_user_id:
            query_sql += "\n  AND id <> CAST(:exclude_user_id AS uuid)"
            params["exclude_user_id"] = exclude_user_id

        query = text(f"{query_sql}\nLIMIT 1")
        result = await self._db.execute(query, params)
        return result.scalar() is not None

    async def exists_user_by_codigo(
        self,
        codigo_institucional: str,
        *,
        exclude_user_id: str | None = None,
    ) -> bool:
        params: dict[str, Any] = {"codigo_institucional": codigo_institucional}
        query_sql = """
            SELECT 1
            FROM sc_users.usuario
            WHERE codigo_institucional = :codigo_institucional
              AND deleted_at IS NULL
        """
        if exclude_user_id:
            query_sql += "\n  AND id <> CAST(:exclude_user_id AS uuid)"
            params["exclude_user_id"] = exclude_user_id

        query = text(f"{query_sql}\nLIMIT 1")
        result = await self._db.execute(query, params)
        return result.scalar() is not None

    async def create_user(
        self,
        *,
        email: str,
        nombre: str,
        apellido: str,
        codigo_institucional: str | None,
        departamento: str | None,
        estado: str,
    ) -> str:
        query = text(
            """
            INSERT INTO sc_users.usuario (
                email,
                nombre,
                apellido,
                codigo_institucional,
                departamento,
                estado,
                email_verificado,
                password_hash,
                created_at,
                updated_at
            )
            VALUES (
                :email,
                :nombre,
                :apellido,
                :codigo_institucional,
                :departamento,
                CAST(:estado AS estado_usuario),
                FALSE,
                NULL,
                NOW(),
                NOW()
            )
            RETURNING id
            """,
        )
        result = await self._db.execute(
            query,
            {
                "email": email,
                "nombre": nombre,
                "apellido": apellido,
                "codigo_institucional": codigo_institucional,
                "departamento": departamento,
                "estado": estado,
            },
        )
        return str(result.scalar_one())

    async def update_user(
        self,
        *,
        user_id: str,
        email: str | None,
        nombre: str | None,
        apellido: str | None,
        codigo_institucional: str | None,
        departamento: str | None,
        estado: str | None,
    ) -> None:
        query = text(
            """
            UPDATE sc_users.usuario
            SET
                email = COALESCE(:email, email),
                nombre = COALESCE(:nombre, nombre),
                apellido = COALESCE(:apellido, apellido),
                codigo_institucional = COALESCE(:codigo_institucional, codigo_institucional),
                departamento = COALESCE(:departamento, departamento),
                estado = COALESCE(CAST(:estado AS estado_usuario), estado),
                updated_at = NOW()
            WHERE id = CAST(:user_id AS uuid)
              AND deleted_at IS NULL
            """,
        )
        await self._db.execute(
            query,
            {
                "user_id": user_id,
                "email": email,
                "nombre": nombre,
                "apellido": apellido,
                "codigo_institucional": codigo_institucional,
                "departamento": departamento,
                "estado": estado,
            },
        )

    async def update_my_profile(
        self,
        *,
        user_id: str,
        nombre: str | None,
        apellido: str | None,
        departamento: str | None,
        telefono: str | None,
        avatar_url: str | None,
    ) -> None:
        query = text(
            """
            UPDATE sc_users.usuario
            SET
                nombre = COALESCE(:nombre, nombre),
                apellido = COALESCE(:apellido, apellido),
                departamento = COALESCE(:departamento, departamento),
                telefono = COALESCE(:telefono, telefono),
                avatar_url = COALESCE(:avatar_url, avatar_url),
                updated_at = NOW()
            WHERE id = CAST(:user_id AS uuid)
              AND deleted_at IS NULL
            """,
        )
        await self._db.execute(
            query,
            {
                "user_id": user_id,
                "nombre": nombre,
                "apellido": apellido,
                "departamento": departamento,
                "telefono": telefono,
                "avatar_url": avatar_url,
            },
        )

    async def set_user_estado(self, *, user_id: str, estado: str) -> None:
        query = text(
            """
            UPDATE sc_users.usuario
            SET estado = CAST(:estado AS estado_usuario),
                updated_at = NOW()
            WHERE id = CAST(:user_id AS uuid)
              AND deleted_at IS NULL
            """,
        )
        await self._db.execute(query, {"user_id": user_id, "estado": estado})

    async def replace_user_roles(self, *, user_id: str, role_ids: list[str]) -> None:
        delete_query = text(
            """
            DELETE FROM sc_users.usuario_rol
            WHERE usuario_id = CAST(:user_id AS uuid)
            """,
        )
        await self._db.execute(delete_query, {"user_id": user_id})

        for role_id in dict.fromkeys(role_ids):
            insert_query = text(
                """
                INSERT INTO sc_users.usuario_rol (usuario_id, rol_id)
                VALUES (CAST(:user_id AS uuid), CAST(:role_id AS uuid))
                """,
            )
            await self._db.execute(insert_query, {"user_id": user_id, "role_id": role_id})

    async def list_roles(self) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT
                r.id,
                r.nombre,
                r.descripcion,
                r.es_sistema,
                COUNT(rp.permiso_id)::int AS permissions_count
            FROM sc_users.rol r
            LEFT JOIN sc_users.rol_permiso rp ON rp.rol_id = r.id
            GROUP BY r.id, r.nombre, r.descripcion, r.es_sistema
            ORDER BY r.nombre ASC
            """,
        )
        result = await self._db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def find_role_by_id(self, role_id: str) -> dict[str, Any] | None:
        query = text(
            """
            SELECT id, nombre, descripcion, es_sistema
            FROM sc_users.rol
            WHERE id = CAST(:role_id AS uuid)
            LIMIT 1
            """,
        )
        result = await self._db.execute(query, {"role_id": role_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def find_role_by_name(self, role_name: str) -> dict[str, Any] | None:
        query = text(
            """
            SELECT id, nombre, descripcion, es_sistema
            FROM sc_users.rol
            WHERE lower(nombre) = lower(:role_name)
            LIMIT 1
            """,
        )
        result = await self._db.execute(query, {"role_name": role_name})
        row = result.mappings().first()
        return dict(row) if row else None

    async def exists_role_by_name(self, nombre: str, *, exclude_role_id: str | None = None) -> bool:
        params: dict[str, Any] = {"nombre": nombre}
        query_sql = """
            SELECT 1
            FROM sc_users.rol
            WHERE lower(nombre) = lower(:nombre)
        """
        if exclude_role_id:
            query_sql += "\n  AND id <> CAST(:exclude_role_id AS uuid)"
            params["exclude_role_id"] = exclude_role_id

        query = text(f"{query_sql}\nLIMIT 1")
        result = await self._db.execute(query, params)
        return result.scalar() is not None

    async def create_role(self, *, nombre: str, descripcion: str | None) -> str:
        query = text(
            """
            INSERT INTO sc_users.rol (nombre, descripcion, es_sistema, created_at, updated_at)
            VALUES (:nombre, :descripcion, FALSE, NOW(), NOW())
            RETURNING id
            """,
        )
        result = await self._db.execute(query, {"nombre": nombre, "descripcion": descripcion})
        return str(result.scalar_one())

    async def update_role(self, *, role_id: str, nombre: str | None, descripcion: str | None) -> None:
        query = text(
            """
            UPDATE sc_users.rol
            SET
                nombre = COALESCE(:nombre, nombre),
                descripcion = COALESCE(:descripcion, descripcion),
                updated_at = NOW()
            WHERE id = CAST(:role_id AS uuid)
            """,
        )
        await self._db.execute(
            query,
            {"role_id": role_id, "nombre": nombre, "descripcion": descripcion},
        )

    async def count_role_users(self, role_id: str) -> int:
        query = text(
            """
            SELECT COUNT(*)::int
            FROM sc_users.usuario_rol
            WHERE rol_id = CAST(:role_id AS uuid)
            """,
        )
        result = await self._db.execute(query, {"role_id": role_id})
        return int(result.scalar_one())

    async def delete_role(self, role_id: str) -> None:
        query = text(
            """
            DELETE FROM sc_users.rol
            WHERE id = CAST(:role_id AS uuid)
            """,
        )
        await self._db.execute(query, {"role_id": role_id})

    async def list_permissions(self) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT id, modulo, accion, descripcion
            FROM sc_users.permiso
            ORDER BY modulo ASC, accion ASC
            """,
        )
        result = await self._db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def list_permission_ids(self) -> list[str]:
        query = text(
            """
            SELECT id
            FROM sc_users.permiso
            ORDER BY id ASC
            """,
        )
        result = await self._db.execute(query)
        return [str(row[0]) for row in result.all()]

    async def list_role_permissions(self) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT rol_id, permiso_id
            FROM sc_users.rol_permiso
            ORDER BY rol_id ASC, permiso_id ASC
            """,
        )
        result = await self._db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def replace_role_permissions(self, *, role_id: str, permission_ids: list[str]) -> None:
        delete_query = text(
            """
            DELETE FROM sc_users.rol_permiso
            WHERE rol_id = CAST(:role_id AS uuid)
            """,
        )
        await self._db.execute(delete_query, {"role_id": role_id})

        for permission_id in dict.fromkeys(permission_ids):
            insert_query = text(
                """
                INSERT INTO sc_users.rol_permiso (rol_id, permiso_id)
                VALUES (CAST(:role_id AS uuid), CAST(:permission_id AS uuid))
                """,
            )
            await self._db.execute(
                insert_query,
                {"role_id": role_id, "permission_id": permission_id},
            )

    async def ensure_integrations_exist(self, *, service_names: list[str]) -> None:
        for service_name in dict.fromkeys(service_names):
            query = text(
                """
                INSERT INTO sc_dashboard.estado_integracion (
                    servicio,
                    estado,
                    ultimo_check,
                    tiempo_respuesta_ms,
                    detalle,
                    created_at,
                    updated_at
                )
                VALUES (
                    :servicio,
                    CAST('DESCONOCIDO' AS estado_servicio),
                    NULL,
                    NULL,
                    '{}'::jsonb,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (servicio) DO NOTHING
                """,
            )
            await self._db.execute(query, {"servicio": service_name})

    async def list_integrations(self) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT
                id,
                servicio,
                estado,
                ultimo_check,
                tiempo_respuesta_ms,
                detalle,
                updated_at
            FROM sc_dashboard.estado_integracion
            ORDER BY servicio ASC
            """,
        )
        result = await self._db.execute(query)
        return [dict(row) for row in result.mappings().all()]

    async def find_integration_by_service(self, service_name: str) -> dict[str, Any] | None:
        query = text(
            """
            SELECT
                id,
                servicio,
                estado,
                ultimo_check,
                tiempo_respuesta_ms,
                detalle,
                updated_at
            FROM sc_dashboard.estado_integracion
            WHERE servicio = :service_name
            LIMIT 1
            """,
        )
        result = await self._db.execute(query, {"service_name": service_name})
        row = result.mappings().first()
        return dict(row) if row else None

    async def update_integration_status(
        self,
        *,
        service_name: str,
        estado: str,
        tiempo_respuesta_ms: int | None,
        detalle: dict[str, Any],
    ) -> None:
        query = text(
            """
            UPDATE sc_dashboard.estado_integracion
            SET
                estado = CAST(:estado AS estado_servicio),
                ultimo_check = NOW(),
                tiempo_respuesta_ms = :tiempo_respuesta_ms,
                detalle = CAST(:detalle AS jsonb),
                updated_at = NOW()
            WHERE servicio = :service_name
            """,
        )
        await self._db.execute(
            query,
            {
                "service_name": service_name,
                "estado": estado,
                "tiempo_respuesta_ms": tiempo_respuesta_ms,
                "detalle": json.dumps(detalle, ensure_ascii=True),
            },
        )

    async def list_audit_logs(
        self,
        *,
        limit: int,
        search: str | None,
        event_type: str | None,
        modulo: str | None,
        desde: str | None,
        hasta: str | None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"limit": limit}
        where_clauses: list[str] = ["1=1"]

        if search:
            params["search"] = f"%{search.lower()}%"
            where_clauses.append(
                """
                (
                    lower(COALESCE(ra.accion, '')) LIKE :search
                    OR lower(COALESCE(ra.modulo, '')) LIKE :search
                    OR lower(COALESCE(CAST(ra.detalle AS text), '')) LIKE :search
                    OR lower(COALESCE(u.nombre, '') || ' ' || COALESCE(u.apellido, '')) LIKE :search
                    OR lower(COALESCE(u.email, '')) LIKE :search
                )
                """,
            )

        if event_type:
            params["event_type"] = event_type
            where_clauses.append("COALESCE(ra.detalle->>'tipo_evento', 'otro') = :event_type")

        if modulo:
            params["modulo"] = modulo.lower()
            where_clauses.append("lower(ra.modulo) = :modulo")

        if desde:
            params["desde"] = desde
            where_clauses.append("ra.fecha_registro >= CAST(:desde AS timestamptz)")

        if hasta:
            params["hasta"] = hasta
            where_clauses.append("ra.fecha_registro <= CAST(:hasta AS timestamptz)")

        query = text(
            f"""
            SELECT
                ra.id,
                ra.accion,
                ra.modulo,
                ra.entidad,
                ra.entidad_id,
                ra.detalle,
                ra.ip_origen,
                ra.dispositivo,
                ra.fecha_registro,
                u.nombre,
                u.apellido,
                u.email,
                COALESCE(ra.detalle->>'tipo_evento', 'otro') AS tipo_evento,
                COALESCE(ra.detalle->>'descripcion', '') AS detalle_descripcion
            FROM sc_auditoria.registro_auditoria ra
            LEFT JOIN sc_users.usuario u ON u.id = ra.usuario_id
            WHERE {' AND '.join(where_clauses)}
            ORDER BY ra.fecha_registro DESC
            LIMIT :limit
            """,
        )
        result = await self._db.execute(query, params)
        return [dict(row) for row in result.mappings().all()]

    async def insert_audit_log(
        self,
        *,
        usuario_id: str | None,
        accion: str,
        modulo: str,
        entidad: str | None,
        entidad_id: str | None,
        detalle: dict[str, Any],
        ip_origen: str | None,
        dispositivo: str | None,
    ) -> None:
        query = text(
            """
            INSERT INTO sc_auditoria.registro_auditoria (
                usuario_id,
                accion,
                modulo,
                entidad,
                entidad_id,
                detalle,
                ip_origen,
                dispositivo,
                fecha_registro
            )
            VALUES (
                CAST(:usuario_id AS uuid),
                :accion,
                :modulo,
                :entidad,
                CAST(:entidad_id AS uuid),
                CAST(:detalle AS jsonb),
                CAST(:ip_origen AS inet),
                :dispositivo,
                NOW()
            )
            """,
        )
        await self._db.execute(
            query,
            {
                "usuario_id": usuario_id,
                "accion": accion,
                "modulo": modulo,
                "entidad": entidad,
                "entidad_id": entidad_id,
                "detalle": json.dumps(detalle, ensure_ascii=True),
                "ip_origen": ip_origen,
                "dispositivo": dispositivo,
            },
        )
