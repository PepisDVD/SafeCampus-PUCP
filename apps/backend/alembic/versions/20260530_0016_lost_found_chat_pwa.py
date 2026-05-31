"""
Lost & Found PWA community chat extensions.
"""

from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260530_0016"
down_revision: str | None = "20260514_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("comentario_caso_lf", sa.Column("parent_id", sa.UUID(), nullable=True), schema="sc_lost_found")
    op.add_column("comentario_caso_lf", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True), schema="sc_lost_found")
    op.create_foreign_key(
        "fk_lf_comentario_parent",
        "comentario_caso_lf",
        "comentario_caso_lf",
        ["parent_id"],
        ["id"],
        source_schema="sc_lost_found",
        referent_schema="sc_lost_found",
        ondelete="CASCADE",
    )
    op.create_index("ix_lf_comentario_parent", "comentario_caso_lf", ["parent_id"], schema="sc_lost_found")
    op.add_column("participante_hilo_lf", sa.Column("ultima_lectura_at", sa.DateTime(timezone=True), nullable=True), schema="sc_lost_found")


def downgrade() -> None:
    op.drop_column("participante_hilo_lf", "ultima_lectura_at", schema="sc_lost_found")
    op.drop_index("ix_lf_comentario_parent", table_name="comentario_caso_lf", schema="sc_lost_found")
    op.drop_constraint("fk_lf_comentario_parent", "comentario_caso_lf", schema="sc_lost_found", type_="foreignkey")
    op.drop_column("comentario_caso_lf", "deleted_at", schema="sc_lost_found")
    op.drop_column("comentario_caso_lf", "parent_id", schema="sc_lost_found")
