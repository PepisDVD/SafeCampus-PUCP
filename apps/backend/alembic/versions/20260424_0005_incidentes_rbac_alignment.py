"""Align incident registration permissions

Revision ID: 20260424_0005
Revises: 20260423_0004
Create Date: 2026-04-24
"""

from __future__ import annotations

from alembic import op

revision = "20260424_0005"
down_revision = "20260423_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO sc_users.permiso (modulo, accion, descripcion)
        VALUES
            ('incidentes', 'crear', 'Crear nuevos incidentes'),
            ('incidentes', 'ver', 'Ver incidentes'),
            ('incidentes', 'ver_todos', 'Ver todos los incidentes del sistema'),
            ('incidentes', 'editar', 'Editar incidentes asignados'),
            ('incidentes', 'asignar', 'Asignar operador a incidentes'),
            ('incidentes', 'escalar', 'Escalar incidentes'),
            ('incidentes', 'cerrar', 'Cerrar incidentes')
        ON CONFLICT (modulo, accion) DO NOTHING;

        INSERT INTO sc_users.rol_permiso (rol_id, permiso_id)
        SELECT r.id, p.id
        FROM sc_users.rol r
        JOIN sc_users.permiso p ON (p.modulo, p.accion) IN (
            ('incidentes', 'crear'),
            ('incidentes', 'ver')
        )
        WHERE r.nombre = 'comunidad'
        ON CONFLICT ON CONSTRAINT uq_rol_permiso DO NOTHING;

        INSERT INTO sc_users.rol_permiso (rol_id, permiso_id)
        SELECT r.id, p.id
        FROM sc_users.rol r
        JOIN sc_users.permiso p ON p.modulo = 'incidentes'
        WHERE r.nombre = 'administrador'
        ON CONFLICT ON CONSTRAINT uq_rol_permiso DO NOTHING;
        """,
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM sc_users.rol_permiso rp
        USING sc_users.rol r, sc_users.permiso p
        WHERE rp.rol_id = r.id
          AND rp.permiso_id = p.id
          AND r.nombre IN ('comunidad', 'administrador')
          AND p.modulo = 'incidentes';
        """,
    )
