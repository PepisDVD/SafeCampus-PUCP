"""Clear active cycle tags from closed omnichannel conversations.

Revision ID: 20260627_0031
Revises: 20260626_0030
Create Date: 2026-06-27
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "20260627_0031"
down_revision: str | None = "20260626_0030"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.alter_column(
        "conversacion",
        "modo_atencion",
        existing_type=sa.String(length=16),
        nullable=True,
        existing_server_default="BOT",
        schema="sc_omnicanal",
    )
    op.alter_column(
        "conversacion",
        "prioridad",
        existing_type=sa.String(length=16),
        nullable=True,
        existing_server_default="MEDIO",
        schema="sc_omnicanal",
    )
    op.execute(
        """
        UPDATE sc_omnicanal.conversacion
        SET modo_atencion = NULL,
            prioridad = NULL,
            operador_asignado_id = NULL,
            tomado_por_id = NULL,
            tomado_at = NULL,
            updated_at = now()
        WHERE estado = 'CERRADA'
        """
    )
    op.execute(
        """
        DELETE FROM sc_omnicanal.chatbot_estado_conversacion chatbot
        USING sc_omnicanal.conversacion conversacion
        WHERE chatbot.conversacion_id = conversacion.id
          AND conversacion.estado = 'CERRADA'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE sc_omnicanal.conversacion
        SET modo_atencion = COALESCE(modo_atencion, 'HUMANO'),
            prioridad = COALESCE(prioridad, 'MEDIO'),
            updated_at = now()
        WHERE modo_atencion IS NULL
           OR prioridad IS NULL
        """
    )
    op.alter_column(
        "conversacion",
        "prioridad",
        existing_type=sa.String(length=16),
        nullable=False,
        existing_server_default="MEDIO",
        schema="sc_omnicanal",
    )
    op.alter_column(
        "conversacion",
        "modo_atencion",
        existing_type=sa.String(length=16),
        nullable=False,
        existing_server_default="BOT",
        schema="sc_omnicanal",
    )
