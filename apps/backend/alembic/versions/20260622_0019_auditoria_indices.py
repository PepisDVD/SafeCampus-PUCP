"""
Performance indexes for the centralized audit log (sc_auditoria.registro_auditoria).

This migration is additive: it only creates indexes to support the audit screen
upgrade (keyset pagination ordered by ``fecha_registro DESC, id DESC`` plus the
module / user / entity filters). The table itself is NOT altered.

Recommended usage of the ``detalle`` JSONB column (read-only conventions, never
store secrets/passwords/tokens):
  - origen           -> WEB | APP_MOVIL | WHATSAPP | SISTEMA
  - resultado        -> exitoso | fallido | denegado
  - codigo_entidad   -> business code of the affected entity (e.g. INC-2026...)
  - resumen          -> short human-readable summary
  - before / after   -> previous vs new values for change diffs
  - correlation_id   -> trace correlation id
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260622_0019"
down_revision: str | None = "20260514_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_registro_auditoria_fecha_id "
        "ON sc_auditoria.registro_auditoria (fecha_registro DESC, id DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_registro_auditoria_usuario_fecha "
        "ON sc_auditoria.registro_auditoria (usuario_id, fecha_registro DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_registro_auditoria_modulo_fecha "
        "ON sc_auditoria.registro_auditoria (modulo, fecha_registro DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_registro_auditoria_entidad_fecha "
        "ON sc_auditoria.registro_auditoria (entidad, entidad_id, fecha_registro DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS sc_auditoria.idx_registro_auditoria_entidad_fecha")
    op.execute("DROP INDEX IF EXISTS sc_auditoria.idx_registro_auditoria_modulo_fecha")
    op.execute("DROP INDEX IF EXISTS sc_auditoria.idx_registro_auditoria_usuario_fecha")
    op.execute("DROP INDEX IF EXISTS sc_auditoria.idx_registro_auditoria_fecha_id")
