"""Support OAuth user sync for sc_users.usuario

Revision ID: 20260423_0003
Revises: 20260413_0002
Create Date: 2026-04-23
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260423_0003"
down_revision = "20260413_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'sc_users'
                  AND table_name = 'usuario'
                  AND column_name = 'password_hash'
                  AND is_nullable = 'NO'
            ) THEN
                ALTER TABLE sc_users.usuario
                ALTER COLUMN password_hash DROP NOT NULL;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'sc_users'
                  AND table_name = 'usuario'
                  AND column_name = 'auth_user_id'
            ) THEN
                ALTER TABLE sc_users.usuario
                ADD COLUMN auth_user_id UUID;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'sc_users'
                  AND table_name = 'usuario'
                  AND column_name = 'auth_provider'
            ) THEN
                ALTER TABLE sc_users.usuario
                ADD COLUMN auth_provider VARCHAR(50);
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'sc_users'
                  AND indexname = 'uq_usuario_auth_user_id'
            ) THEN
                CREATE UNIQUE INDEX uq_usuario_auth_user_id
                ON sc_users.usuario(auth_user_id)
                WHERE auth_user_id IS NOT NULL;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'sc_users'
                  AND indexname = 'idx_usuario_auth_provider'
            ) THEN
                CREATE INDEX idx_usuario_auth_provider
                ON sc_users.usuario(auth_provider);
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM sc_users.rol
                WHERE id = '0c21c807-e3d3-4daa-b67f-b8929b3ac10d'::uuid
            ) THEN
                INSERT INTO sc_users.rol (id, nombre, descripcion, es_sistema)
                VALUES (
                    '0c21c807-e3d3-4daa-b67f-b8929b3ac10d'::uuid,
                    'comunidad',
                    'Rol base por defecto para usuarios autenticados por correo institucional.',
                    TRUE
                );
            END IF;
        END
        $$;
        """,
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'sc_users'
                  AND indexname = 'idx_usuario_auth_provider'
            ) THEN
                DROP INDEX sc_users.idx_usuario_auth_provider;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'sc_users'
                  AND indexname = 'uq_usuario_auth_user_id'
            ) THEN
                DROP INDEX sc_users.uq_usuario_auth_user_id;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'sc_users'
                  AND table_name = 'usuario'
                  AND column_name = 'auth_provider'
            ) THEN
                ALTER TABLE sc_users.usuario
                DROP COLUMN auth_provider;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'sc_users'
                  AND table_name = 'usuario'
                  AND column_name = 'auth_user_id'
            ) THEN
                ALTER TABLE sc_users.usuario
                DROP COLUMN auth_user_id;
            END IF;

            UPDATE sc_users.usuario
            SET password_hash = 'OAUTH_REMOVED'
            WHERE password_hash IS NULL;

            ALTER TABLE sc_users.usuario
            ALTER COLUMN password_hash SET NOT NULL;
        END
        $$;
        """,
    )
