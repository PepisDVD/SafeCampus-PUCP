"""
Align sc_alertas with T090/T091/T092 design documents.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260514_0017"
down_revision: str | None = "20260514_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    ctx = op.get_context()
    with ctx.autocommit_block():
        op.execute(
            "ALTER TYPE estado_alerta_campus ADD VALUE IF NOT EXISTS 'PENDIENTE_APROBACION';"
        )
        op.execute("ALTER TYPE estado_alerta_campus ADD VALUE IF NOT EXISTS 'EN_ATENCION';")
        op.execute("ALTER TYPE estado_alerta_campus ADD VALUE IF NOT EXISTS 'ATENDIDA';")
        op.execute("ALTER TYPE estado_alerta_campus ADD VALUE IF NOT EXISTS 'EXPIRADA';")

    nivel_severidad = postgresql.ENUM(
        "BAJO",
        "MEDIO",
        "ALTO",
        "CRITICO",
        name="nivel_severidad",
        create_type=False,
    )
    canal_notificacion = postgresql.ENUM(
        "EMAIL",
        "PUSH",
        "SMS",
        "WHATSAPP",
        "INAPP",
        name="canal_notificacion",
        create_type=False,
    )

    op.create_table(
        "zona_geografica",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("codigo", sa.String(length=40), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("tipo", sa.String(length=40), nullable=True),
        sa.Column("geom", sa.Text(), nullable=True),
        sa.Column("centroide", sa.Text(), nullable=True),
        sa.Column("nivel_riesgo", nivel_severidad, nullable=True),
        sa.Column("activa", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo", name="uq_zona_geografica_codigo"),
        schema="sc_alertas",
    )
    op.execute(
        """
        ALTER TABLE sc_alertas.zona_geografica
        ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326)
        USING geom::geometry(MultiPolygon, 4326)
        """
    )
    op.execute(
        """
        ALTER TABLE sc_alertas.zona_geografica
        ALTER COLUMN centroide TYPE geometry(Point, 4326)
        USING centroide::geometry(Point, 4326)
        """
    )
    op.alter_column("zona_geografica", "geom", nullable=False, schema="sc_alertas")
    op.create_index(
        "idx_zona_geografica_geom",
        "zona_geografica",
        ["geom"],
        schema="sc_alertas",
        postgresql_using="gist",
    )
    op.create_index(
        "idx_zona_geografica_activa", "zona_geografica", ["activa"], schema="sc_alertas"
    )

    op.create_table(
        "punto_interes",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("zona_id", sa.UUID(), nullable=True),
        sa.Column("ubicacion_maestra_id", sa.UUID(), nullable=True),
        sa.Column("codigo", sa.String(length=40), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("tipo", sa.String(length=40), nullable=True),
        sa.Column("geom", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["zona_id"], ["sc_alertas.zona_geografica.id"]),
        sa.ForeignKeyConstraint(["ubicacion_maestra_id"], ["sc_maestros.ubicacion_maestra.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo", name="uq_punto_interes_codigo"),
        schema="sc_alertas",
    )
    op.execute(
        """
        ALTER TABLE sc_alertas.punto_interes
        ALTER COLUMN geom TYPE geometry(Point, 4326)
        USING geom::geometry(Point, 4326)
        """
    )
    op.alter_column("punto_interes", "geom", nullable=False, schema="sc_alertas")
    op.create_index(
        "idx_punto_interes_geom",
        "punto_interes",
        ["geom"],
        schema="sc_alertas",
        postgresql_using="gist",
    )

    op.create_table(
        "regla_alerta",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("codigo", sa.String(length=20), nullable=False),
        sa.Column("tipo_alerta", sa.String(length=20), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column(
            "parametros", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column("severidad_resultante", nivel_severidad, nullable=True),
        sa.Column("activa", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo", name="uq_regla_alerta_codigo"),
        schema="sc_alertas",
    )

    op.create_table(
        "plantilla_alerta",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tipo_evento", sa.String(length=100), nullable=False),
        sa.Column("canal", canal_notificacion, nullable=False),
        sa.Column("idioma", sa.String(length=5), server_default="es", nullable=False),
        sa.Column("asunto", sa.String(length=255), nullable=True),
        sa.Column("cuerpo_template", sa.Text(), nullable=False),
        sa.Column(
            "variables", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False
        ),
        sa.Column("activa", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tipo_evento", "canal", "idioma", name="uq_plantilla_alerta_evento_canal_idioma"
        ),
        schema="sc_alertas",
    )

    op.create_table(
        "alerta_zona",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("alerta_id", sa.UUID(), nullable=False),
        sa.Column("zona_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["alerta_id"], ["sc_alertas.alerta.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["zona_id"], ["sc_alertas.zona_geografica.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alerta_id", "zona_id", name="uq_alerta_zona_alerta_zona"),
        schema="sc_alertas",
    )

    op.add_column(
        "alerta", sa.Column("tipo", sa.String(length=20), nullable=True), schema="sc_alertas"
    )
    op.add_column(
        "alerta", sa.Column("familia", sa.String(length=1), nullable=True), schema="sc_alertas"
    )
    op.add_column("alerta", sa.Column("mensaje", sa.Text(), nullable=True), schema="sc_alertas")
    op.add_column(
        "alerta", sa.Column("origen", sa.String(length=20), nullable=True), schema="sc_alertas"
    )
    op.add_column(
        "alerta", sa.Column("incidente_id", sa.UUID(), nullable=True), schema="sc_alertas"
    )
    op.add_column("alerta", sa.Column("regla_id", sa.UUID(), nullable=True), schema="sc_alertas")
    op.add_column(
        "alerta", sa.Column("plantilla_id", sa.UUID(), nullable=True), schema="sc_alertas"
    )
    op.add_column(
        "alerta",
        sa.Column("vigencia_inicio", sa.DateTime(timezone=True), nullable=True),
        schema="sc_alertas",
    )
    op.add_column(
        "alerta",
        sa.Column("vigencia_fin", sa.DateTime(timezone=True), nullable=True),
        schema="sc_alertas",
    )
    op.add_column(
        "alerta",
        sa.Column("programada_para", sa.DateTime(timezone=True), nullable=True),
        schema="sc_alertas",
    )
    op.add_column(
        "alerta", sa.Column("creada_por_id", sa.UUID(), nullable=True), schema="sc_alertas"
    )
    op.add_column(
        "alerta", sa.Column("aprobada_por_id", sa.UUID(), nullable=True), schema="sc_alertas"
    )
    op.add_column(
        "alerta", sa.Column("atendida_por_id", sa.UUID(), nullable=True), schema="sc_alertas"
    )
    op.execute(
        """
        UPDATE sc_alertas.alerta
        SET
            tipo = COALESCE(tipo, 'ALR-MAS-SEG'),
            familia = COALESCE(familia, 'A'),
            mensaje = COALESCE(mensaje, contenido),
            origen = COALESCE(origen, 'MANUAL'),
            vigencia_inicio = COALESCE(vigencia_inicio, fecha_inicio),
            vigencia_fin = COALESCE(vigencia_fin, fecha_fin),
            programada_para = COALESCE(programada_para, fecha_programada),
            creada_por_id = COALESCE(creada_por_id, created_by_id),
            aprobada_por_id = COALESCE(aprobada_por_id, published_by_id);
        """
    )
    op.alter_column("alerta", "tipo", nullable=False, schema="sc_alertas")
    op.alter_column("alerta", "familia", nullable=False, schema="sc_alertas")
    op.alter_column("alerta", "origen", nullable=False, schema="sc_alertas")
    op.create_foreign_key(
        "fk_alerta_incidente",
        "alerta",
        "incidente",
        ["incidente_id"],
        ["id"],
        source_schema="sc_alertas",
        referent_schema="sc_incidentes",
    )
    op.create_foreign_key(
        "fk_alerta_regla",
        "alerta",
        "regla_alerta",
        ["regla_id"],
        ["id"],
        source_schema="sc_alertas",
        referent_schema="sc_alertas",
    )
    op.create_foreign_key(
        "fk_alerta_plantilla",
        "alerta",
        "plantilla_alerta",
        ["plantilla_id"],
        ["id"],
        source_schema="sc_alertas",
        referent_schema="sc_alertas",
    )
    op.create_foreign_key(
        "fk_alerta_creada_por",
        "alerta",
        "usuario",
        ["creada_por_id"],
        ["id"],
        source_schema="sc_alertas",
        referent_schema="sc_users",
    )
    op.create_foreign_key(
        "fk_alerta_aprobada_por",
        "alerta",
        "usuario",
        ["aprobada_por_id"],
        ["id"],
        source_schema="sc_alertas",
        referent_schema="sc_users",
    )
    op.create_foreign_key(
        "fk_alerta_atendida_por",
        "alerta",
        "usuario",
        ["atendida_por_id"],
        ["id"],
        source_schema="sc_alertas",
        referent_schema="sc_users",
    )
    op.create_index("idx_alerta_tipo", "alerta", ["tipo"], schema="sc_alertas")
    op.create_index("idx_alerta_incidente", "alerta", ["incidente_id"], schema="sc_alertas")

    op.add_column(
        "alerta_evento",
        sa.Column("estado_anterior", sa.String(length=40), nullable=True),
        schema="sc_alertas",
    )
    op.add_column(
        "alerta_evento",
        sa.Column("estado_nuevo", sa.String(length=40), nullable=True),
        schema="sc_alertas",
    )
    op.add_column(
        "alerta_evento",
        sa.Column("accion", sa.String(length=100), nullable=True),
        schema="sc_alertas",
    )
    op.add_column(
        "alerta_evento", sa.Column("comentario", sa.Text(), nullable=True), schema="sc_alertas"
    )
    op.execute(
        "UPDATE sc_alertas.alerta_evento SET accion = COALESCE(accion, tipo_evento), estado_nuevo = COALESCE(estado_nuevo, detalle->>'estado');"
    )

    op.execute(
        """
        INSERT INTO sc_alertas.regla_alerta (codigo, tipo_alerta, descripcion, parametros, severidad_resultante, activa)
        VALUES
            ('RGA-01', 'ALR-MAS-*', 'Disparo manual de alerta masiva por zona.', '{"requiere_aprobacion": true}'::jsonb, NULL, true),
            ('RGA-02', 'ALR-INC-CRIT', 'Incidente creado o actualizado con severidad CRITICO.', '{}'::jsonb, 'CRITICO', true),
            ('RGA-03', 'ALR-INC-CLUSTER', 'N incidentes activos dentro de radio R y ventana T.', '{"n": 3, "radio_m": 150, "ventana_min": 60}'::jsonb, 'ALTO', true),
            ('RGA-04', 'ALR-INC-SLA', 'Incidente supera SLA de primera respuesta o resolucion.', '{"critico_min": 2, "alto_min": 10, "medio_min": 30, "bajo_min": 120}'::jsonb, 'ALTO', true),
            ('RGA-05', 'ALR-INC-ESCAL', 'Incidente transiciona a ESCALADO.', '{}'::jsonb, 'ALTO', true),
            ('RGA-06', 'ALR-ACO-PANIC', 'Boton de panico activado.', '{}'::jsonb, 'CRITICO', true),
            ('RGA-07', 'ALR-ACO-DESV', 'Salida de geocerca segura o desvio de ruta.', '{"desviacion_m": 80}'::jsonb, 'ALTO', true),
            ('RGA-08', 'ALR-ACO-DESC', 'Perdida de senal durante acompanamiento.', '{"timeout_min": 5}'::jsonb, 'MEDIO', true),
            ('RGA-09', 'ALR-ACO-VENC', 'Acompanamiento vence sin check-in.', '{"gracia_min": 5}'::jsonb, 'MEDIO', true)
        ON CONFLICT (codigo) DO NOTHING;
        """
    )
    op.execute(
        """
        INSERT INTO sc_alertas.plantilla_alerta (tipo_evento, canal, asunto, cuerpo_template, variables, activa)
        VALUES
            ('ALR-MAS-SEG', 'INAPP', 'Alerta de seguridad: {{zona}}', 'Se reporta una situacion de seguridad en {{zona}} ({{fecha_hora}}). {{instruccion}}', '["zona","fecha_hora","instruccion"]'::jsonb, true),
            ('ALR-MAS-EVAC', 'INAPP', 'Orden de evacuacion: {{zona}}', 'Se ha emitido una orden de evacuacion para {{zona}} a las {{fecha_hora}}. {{instruccion}} Punto de encuentro: {{punto_encuentro}}.', '["zona","fecha_hora","instruccion","punto_encuentro"]'::jsonb, true),
            ('ALR-INC-CRIT', 'INAPP', 'Incidente critico: {{codigo_incidente}}', 'El incidente {{codigo_incidente}} ({{titulo_incidente}}) en {{zona}} alcanzo severidad CRITICA a las {{fecha_hora}}.', '["codigo_incidente","titulo_incidente","zona","fecha_hora"]'::jsonb, true),
            ('ALR-INC-CLUSTER', 'INAPP', 'Concentracion de incidentes en {{zona}}', 'Se detectaron {{cantidad}} incidentes activos en {{zona}} en los ultimos {{ventana_min}} min. Revisar centro de monitoreo.', '["cantidad","zona","ventana_min"]'::jsonb, true),
            ('ALR-INC-SLA', 'INAPP', 'SLA vencido: {{codigo_incidente}}', 'El incidente {{codigo_incidente}} supero su SLA de {{tipo_sla}} ({{sla_objetivo}}). Accion requerida.', '["codigo_incidente","tipo_sla","sla_objetivo"]'::jsonb, true),
            ('ALR-INC-ESCAL', 'INAPP', 'Incidente escalado {{codigo_incidente}}', 'El incidente {{codigo_incidente}} fue escalado. Requiere atencion de supervision.', '["codigo_incidente"]'::jsonb, true),
            ('ALR-ACO-PANIC', 'INAPP', 'Boton de panico activado', '{{nombre_usuario}} activo el boton de panico en {{ubicacion}} a las {{fecha_hora}}. Ver en mapa: {{enlace_ubicacion}}.', '["nombre_usuario","ubicacion","fecha_hora","enlace_ubicacion"]'::jsonb, true)
        ON CONFLICT (tipo_evento, canal, idioma) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.drop_table("alerta_zona", schema="sc_alertas")
    op.drop_table("plantilla_alerta", schema="sc_alertas")
    op.drop_table("regla_alerta", schema="sc_alertas")
    op.drop_table("punto_interes", schema="sc_alertas")
    op.drop_table("zona_geografica", schema="sc_alertas")
