"""Enforce clean active-cycle fields for closed conversations.

Revision ID: 20260627_0032
Revises: 20260627_0031
Create Date: 2026-06-27
"""

from __future__ import annotations

from alembic import op

revision: str = "20260627_0032"
down_revision: str | None = "20260627_0031"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
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
          AND (
            modo_atencion IS NOT NULL
            OR prioridad IS NOT NULL
            OR operador_asignado_id IS NOT NULL
            OR tomado_por_id IS NOT NULL
            OR tomado_at IS NOT NULL
          )
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
    op.create_check_constraint(
        "ck_conversacion_cerrada_sin_ciclo",
        "conversacion",
        "estado <> 'CERRADA' OR (modo_atencion IS NULL AND prioridad IS NULL "
        "AND operador_asignado_id IS NULL AND tomado_por_id IS NULL AND tomado_at IS NULL)",
        schema="sc_omnicanal",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_conversacion_cerrada_sin_ciclo",
        "conversacion",
        schema="sc_omnicanal",
        type_="check",
    )
