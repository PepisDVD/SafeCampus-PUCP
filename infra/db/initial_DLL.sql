-- ============================================================================
-- SafeCampus PUCP — DDL Completo del Modelo Físico
-- ============================================================================
-- Base:        PostgreSQL 16 + PostGIS 3.4
-- Codificación: UTF-8
-- Esquemas:    9 esquemas lógicos
-- Tablas:      33 tablas (29 del modelo canónico + 4 de soporte)
-- ENUMs:       18 tipos enumerados
-- Fuente:      Esquema de Datos Canónico y Reglas de Numeración v1.0
-- Autores:     Luis Pachas / Yomira Salazar
-- Fecha:       Abril 2026
-- ============================================================================
-- NOTA: Compatible con Supabase (PostgreSQL 15+).
--       Si usas Supabase, PostGIS ya viene habilitado desde el dashboard.
--       Ejecuta este script completo en el SQL Editor de Supabase.
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 0: EXTENSIONES                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 1: ESQUEMAS LÓGICOS (9 dominios funcionales)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE SCHEMA IF NOT EXISTS sc_users;
CREATE SCHEMA IF NOT EXISTS sc_omnicanal;
CREATE SCHEMA IF NOT EXISTS sc_incidentes;
CREATE SCHEMA IF NOT EXISTS sc_clasificacion;
CREATE SCHEMA IF NOT EXISTS sc_notificaciones;
CREATE SCHEMA IF NOT EXISTS sc_dashboard;
CREATE SCHEMA IF NOT EXISTS sc_lost_found;
CREATE SCHEMA IF NOT EXISTS sc_acompanamiento;
CREATE SCHEMA IF NOT EXISTS sc_auditoria;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 2: TIPOS ENUM (18 tipos)                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- sc_users
CREATE TYPE estado_usuario       AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');
CREATE TYPE estado_sesion        AS ENUM ('ACTIVA', 'EXPIRADA', 'REVOCADA');
CREATE TYPE tipo_dispositivo     AS ENUM ('WEB', 'MOVIL', 'TABLET');

-- sc_omnicanal
CREATE TYPE tipo_canal           AS ENUM ('WEB', 'MOVIL', 'MENSAJERIA');
CREATE TYPE estado_reporte       AS ENUM ('RECIBIDO', 'NORMALIZADO', 'ENRUTADO', 'ERROR');

-- sc_incidentes
CREATE TYPE estado_incidente     AS ENUM ('RECIBIDO', 'EN_EVALUACION', 'EN_ATENCION', 'ESCALADO', 'PENDIENTE_INFO', 'RESUELTO', 'CERRADO');
CREATE TYPE nivel_severidad      AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- sc_clasificacion
CREATE TYPE origen_clasificacion AS ENUM ('IA', 'REGLA', 'FALLBACK', 'HUMANO');

-- sc_notificaciones
CREATE TYPE canal_notificacion   AS ENUM ('EMAIL', 'PUSH', 'SMS', 'WHATSAPP', 'INAPP');
CREATE TYPE estado_notificacion  AS ENUM ('PENDIENTE', 'ENVIADA', 'FALLIDA', 'DESCARTADA');

-- sc_dashboard
CREATE TYPE tipo_kpi             AS ENUM ('FRT', 'TMR', 'VOLUMEN', 'DISTRIBUCION', 'TASA_RESOLUCION');

-- sc_lost_found
CREATE TYPE tipo_caso_lf         AS ENUM ('PERDIDO', 'ENCONTRADO');
CREATE TYPE estado_caso_lf       AS ENUM ('ABIERTO', 'EN_REVISION', 'DEVUELTO', 'DESCARTADO', 'CERRADO');

-- sc_acompanamiento
CREATE TYPE estado_acompanamiento AS ENUM ('PENDIENTE', 'ACTIVO', 'ALERTA', 'FINALIZADO', 'CANCELADO');
CREATE TYPE tipo_alerta_as       AS ENUM ('MANUAL', 'VENCIMIENTO', 'DESCONEXION');
CREATE TYPE estado_alerta        AS ENUM ('ACTIVA', 'ATENDIDA', 'CANCELADA');
CREATE TYPE tipo_evento_as       AS ENUM ('INICIO', 'ALERTA', 'DESCONEXION', 'RECONEXION', 'FIN', 'CANCELACION');

-- sc_dashboard (monitoreo)
CREATE TYPE estado_servicio      AS ENUM ('OK', 'DEGRADADO', 'CAIDO', 'DESCONOCIDO');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 3: TABLAS — sc_users (7 tablas)                               ║
-- ║  Gestión de usuarios, roles, permisos, dispositivos y sesiones         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 3.1 usuario
CREATE TABLE sc_users.usuario (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 VARCHAR(255)     NOT NULL,
    nombre                VARCHAR(100)     NOT NULL,
    apellido              VARCHAR(100)     NOT NULL,
    codigo_institucional  VARCHAR(20),
    password_hash         VARCHAR(255)     NOT NULL,
    avatar_url            TEXT,
    telefono              VARCHAR(20),
    estado                estado_usuario   NOT NULL DEFAULT 'ACTIVO',
    email_verificado      BOOLEAN          NOT NULL DEFAULT FALSE,
    ultimo_acceso         TIMESTAMPTZ,
    created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,

    CONSTRAINT uq_usuario_email              UNIQUE (email),
    CONSTRAINT uq_usuario_codigo_inst        UNIQUE (codigo_institucional)
);

CREATE INDEX idx_usuario_estado ON sc_users.usuario (estado);
CREATE INDEX idx_usuario_email  ON sc_users.usuario (email);

-- 3.2 rol
CREATE TABLE sc_users.rol (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR(50)  NOT NULL,
    descripcion  TEXT,
    es_sistema   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_rol_nombre UNIQUE (nombre)
);

-- 3.3 permiso
CREATE TABLE sc_users.permiso (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo       VARCHAR(50)  NOT NULL,
    accion       VARCHAR(50)  NOT NULL,
    descripcion  TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_permiso_modulo_accion UNIQUE (modulo, accion)
);

-- 3.4 usuario_rol (N:M)
CREATE TABLE sc_users.usuario_rol (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID         NOT NULL REFERENCES sc_users.usuario(id) ON DELETE CASCADE,
    rol_id       UUID         NOT NULL REFERENCES sc_users.rol(id) ON DELETE CASCADE,
    asignado_por UUID         REFERENCES sc_users.usuario(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_usuario_rol UNIQUE (usuario_id, rol_id)
);

CREATE INDEX idx_usuario_rol_usuario ON sc_users.usuario_rol (usuario_id);
CREATE INDEX idx_usuario_rol_rol     ON sc_users.usuario_rol (rol_id);

-- 3.5 rol_permiso (N:M)
CREATE TABLE sc_users.rol_permiso (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id       UUID         NOT NULL REFERENCES sc_users.rol(id) ON DELETE CASCADE,
    permiso_id   UUID         NOT NULL REFERENCES sc_users.permiso(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_rol_permiso UNIQUE (rol_id, permiso_id)
);

CREATE INDEX idx_rol_permiso_rol     ON sc_users.rol_permiso (rol_id);
CREATE INDEX idx_rol_permiso_permiso ON sc_users.rol_permiso (permiso_id);

-- 3.6 dispositivo_usuario
CREATE TABLE sc_users.dispositivo_usuario (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID             NOT NULL REFERENCES sc_users.usuario(id) ON DELETE CASCADE,
    tipo            tipo_dispositivo NOT NULL,
    token_push      TEXT             NOT NULL,
    nombre          VARCHAR(100),
    plataforma      VARCHAR(50),
    activo          BOOLEAN          NOT NULL DEFAULT TRUE,
    ultimo_uso      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispositivo_usuario ON sc_users.dispositivo_usuario (usuario_id);

-- 3.7 sesion
CREATE TABLE sc_users.sesion (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID           NOT NULL REFERENCES sc_users.usuario(id) ON DELETE CASCADE,
    token_hash      VARCHAR(512)   NOT NULL,
    ip_origen       INET,
    user_agent      TEXT,
    estado          estado_sesion  NOT NULL DEFAULT 'ACTIVA',
    fecha_expiracion TIMESTAMPTZ   NOT NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sesion_usuario ON sc_users.sesion (usuario_id);
CREATE INDEX idx_sesion_estado  ON sc_users.sesion (estado);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 4: TABLAS — sc_omnicanal (2 tablas)                           ║
-- ║  Orquestación omnicanal: canales y reportes entrantes                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 4.1 canal_reporte
CREATE TABLE sc_omnicanal.canal_reporte (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(50)  NOT NULL,
    tipo            tipo_canal   NOT NULL,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    configuracion   JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canal_reporte_tipo ON sc_omnicanal.canal_reporte (tipo);

-- 4.2 reporte_entrante
CREATE TABLE sc_omnicanal.reporte_entrante (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canal_id          UUID           NOT NULL REFERENCES sc_omnicanal.canal_reporte(id),
    incidente_id      UUID,          -- FK se agrega después de crear sc_incidentes.incidente
    contenido_raw     TEXT           NOT NULL,
    metadatos_canal   JSONB          DEFAULT '{}',
    estado            estado_reporte NOT NULL DEFAULT 'RECIBIDO',
    es_correlacionado BOOLEAN        NOT NULL DEFAULT FALSE,
    ip_origen         INET,
    user_agent        TEXT,
    fecha_recepcion   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reporte_canal       ON sc_omnicanal.reporte_entrante (canal_id);
CREATE INDEX idx_reporte_incidente   ON sc_omnicanal.reporte_entrante (incidente_id);
CREATE INDEX idx_reporte_estado      ON sc_omnicanal.reporte_entrante (estado);
CREATE INDEX idx_reporte_fecha       ON sc_omnicanal.reporte_entrante (fecha_recepcion);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 5: TABLAS — sc_incidentes (6 tablas)                          ║
-- ║  Núcleo del expediente único: incidentes, historial, evidencias,       ║
-- ║  comentarios, ubicaciones y asignación de recursos                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 5.1 incidente (expediente único)
CREATE TABLE sc_incidentes.incidente (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo                VARCHAR(20)      NOT NULL,
    titulo                VARCHAR(200)     NOT NULL,
    descripcion           TEXT             NOT NULL,
    estado                estado_incidente NOT NULL DEFAULT 'RECIBIDO',
    severidad             nivel_severidad,
    categoria             VARCHAR(100),
    subcategoria          VARCHAR(100),
    canal_origen          tipo_canal       NOT NULL,
    -- Georreferenciación principal
    geom                  GEOMETRY(Point, 4326),
    lugar_referencia      VARCHAR(255),
    -- Actores
    reportante_id         UUID             NOT NULL REFERENCES sc_users.usuario(id),
    operador_asignado_id  UUID             REFERENCES sc_users.usuario(id),
    supervisor_id         UUID             REFERENCES sc_users.usuario(id),
    -- SLA
    fecha_primera_respuesta TIMESTAMPTZ,
    fecha_resolucion      TIMESTAMPTZ,
    -- Metadata
    es_anonimo            BOOLEAN          NOT NULL DEFAULT FALSE,
    prioridad_manual      INTEGER,
    notas_internas        TEXT,
    created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,

    CONSTRAINT uq_incidente_codigo UNIQUE (codigo)
);

CREATE INDEX idx_incidente_estado       ON sc_incidentes.incidente (estado);
CREATE INDEX idx_incidente_severidad    ON sc_incidentes.incidente (severidad);
CREATE INDEX idx_incidente_categoria    ON sc_incidentes.incidente (categoria);
CREATE INDEX idx_incidente_reportante   ON sc_incidentes.incidente (reportante_id);
CREATE INDEX idx_incidente_operador     ON sc_incidentes.incidente (operador_asignado_id);
CREATE INDEX idx_incidente_supervisor   ON sc_incidentes.incidente (supervisor_id);
CREATE INDEX idx_incidente_created      ON sc_incidentes.incidente (created_at);
CREATE INDEX idx_incidente_geom         ON sc_incidentes.incidente USING GIST (geom);

-- Ahora agregamos la FK pendiente de reporte_entrante → incidente
ALTER TABLE sc_omnicanal.reporte_entrante
    ADD CONSTRAINT fk_reporte_incidente
    FOREIGN KEY (incidente_id) REFERENCES sc_incidentes.incidente(id);

-- 5.2 historial_incidente
CREATE TABLE sc_incidentes.historial_incidente (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id     UUID             NOT NULL REFERENCES sc_incidentes.incidente(id) ON DELETE CASCADE,
    estado_anterior  estado_incidente,
    estado_nuevo     estado_incidente NOT NULL,
    accion           VARCHAR(100)     NOT NULL,
    comentario       TEXT,
    ejecutado_por_id UUID             NOT NULL REFERENCES sc_users.usuario(id),
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_incidente    ON sc_incidentes.historial_incidente (incidente_id);
CREATE INDEX idx_historial_ejecutor     ON sc_incidentes.historial_incidente (ejecutado_por_id);

-- 5.3 evidencia
CREATE TABLE sc_incidentes.evidencia (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id    UUID         NOT NULL REFERENCES sc_incidentes.incidente(id) ON DELETE CASCADE,
    tipo_archivo    VARCHAR(50)  NOT NULL,  -- imagen, documento, audio, video
    nombre_archivo  VARCHAR(255) NOT NULL,
    url_archivo     TEXT         NOT NULL,
    tamano_bytes    BIGINT,
    mime_type       VARCHAR(100),
    descripcion     TEXT,
    cargado_por_id  UUID         NOT NULL REFERENCES sc_users.usuario(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidencia_incidente ON sc_incidentes.evidencia (incidente_id);

-- 5.4 comentario_incidente
CREATE TABLE sc_incidentes.comentario_incidente (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id  UUID    NOT NULL REFERENCES sc_incidentes.incidente(id) ON DELETE CASCADE,
    autor_id      UUID    NOT NULL REFERENCES sc_users.usuario(id),
    contenido     TEXT    NOT NULL,
    es_interno    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comentario_incidente ON sc_incidentes.comentario_incidente (incidente_id);

-- 5.5 ubicacion_incidente
CREATE TABLE sc_incidentes.ubicacion_incidente (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id     UUID NOT NULL REFERENCES sc_incidentes.incidente(id) ON DELETE CASCADE,
    geom             GEOMETRY(Point, 4326) NOT NULL,
    fuente           VARCHAR(50),      -- gps, manual, whatsapp, ip
    precision_metros NUMERIC(10, 2),
    altitud          NUMERIC(10, 2),
    descripcion      VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ubicacion_incidente     ON sc_incidentes.ubicacion_incidente (incidente_id);
CREATE INDEX idx_ubicacion_incidente_geom ON sc_incidentes.ubicacion_incidente USING GIST (geom);

-- 5.6 asignacion_recurso
CREATE TABLE sc_incidentes.asignacion_recurso (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id    UUID         NOT NULL REFERENCES sc_incidentes.incidente(id) ON DELETE CASCADE,
    tipo_recurso    VARCHAR(50)  NOT NULL,  -- personal, vehiculo, equipamiento
    descripcion     VARCHAR(255) NOT NULL,
    asignado_por_id UUID         NOT NULL REFERENCES sc_users.usuario(id),
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_liberacion TIMESTAMPTZ,
    notas           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asignacion_incidente ON sc_incidentes.asignacion_recurso (incidente_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 6: TABLAS — sc_clasificacion (2 tablas)                       ║
-- ║  Clasificación y priorización asistida por IA                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 6.1 regla_clasificacion (primero, porque clasificacion_ia referencia a esta)
CREATE TABLE sc_clasificacion.regla_clasificacion (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(100)     NOT NULL,
    descripcion         TEXT,
    condicion           JSONB            NOT NULL,  -- condición evaluable
    categoria_resultado VARCHAR(100)     NOT NULL,
    severidad_resultado nivel_severidad  NOT NULL,
    prioridad           INTEGER          NOT NULL DEFAULT 0,  -- orden de evaluación
    activa              BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_regla_nombre UNIQUE (nombre)
);

-- 6.2 clasificacion_ia
CREATE TABLE sc_clasificacion.clasificacion_ia (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id          UUID                 NOT NULL REFERENCES sc_incidentes.incidente(id) ON DELETE CASCADE,
    -- Resultado IA
    categoria_sugerida    VARCHAR(100),
    severidad_sugerida    nivel_severidad,
    confianza             NUMERIC(5, 4),       -- 0.0000 a 1.0000
    origen                origen_clasificacion NOT NULL,
    modelo_utilizado      VARCHAR(100),
    prompt_version        VARCHAR(50),
    tokens_consumidos     INTEGER,
    tiempo_respuesta_ms   INTEGER,
    respuesta_raw         JSONB,
    -- Regla aplicada (si origen = REGLA o FALLBACK)
    regla_clasificacion_id UUID               REFERENCES sc_clasificacion.regla_clasificacion(id),
    -- Confirmación humana
    categoria_final       VARCHAR(100),
    severidad_final       nivel_severidad,
    confirmado_por_id     UUID                 REFERENCES sc_users.usuario(id),
    fecha_confirmacion    TIMESTAMPTZ,
    -- Metadata
    created_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_clasificacion_incidente UNIQUE (incidente_id)
);

CREATE INDEX idx_clasificacion_origen ON sc_clasificacion.clasificacion_ia (origen);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 7: TABLAS — sc_notificaciones (3 tablas)                      ║
-- ║  Alertas y notificaciones multicanal                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 7.1 plantilla_notificacion
CREATE TABLE sc_notificaciones.plantilla_notificacion (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_evento     VARCHAR(100)       NOT NULL,
    canal           canal_notificacion NOT NULL,
    asunto          VARCHAR(255),
    cuerpo_template TEXT               NOT NULL,
    variables       JSONB              DEFAULT '[]',
    activa          BOOLEAN            NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_plantilla_evento_canal UNIQUE (tipo_evento, canal)
);

-- 7.2 notificacion
CREATE TABLE sc_notificaciones.notificacion (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id     UUID               REFERENCES sc_incidentes.incidente(id),
    destinatario_id  UUID               NOT NULL REFERENCES sc_users.usuario(id),
    tipo_evento      VARCHAR(100)       NOT NULL,
    canal            canal_notificacion NOT NULL,
    estado           estado_notificacion NOT NULL DEFAULT 'PENDIENTE',
    asunto           VARCHAR(255),
    contenido        TEXT               NOT NULL,
    reintentos       INTEGER            NOT NULL DEFAULT 0,
    max_reintentos   INTEGER            NOT NULL DEFAULT 3,
    error_detalle    TEXT,
    fecha_envio      TIMESTAMPTZ,
    fecha_lectura    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacion_destinatario ON sc_notificaciones.notificacion (destinatario_id);
CREATE INDEX idx_notificacion_incidente    ON sc_notificaciones.notificacion (incidente_id);
CREATE INDEX idx_notificacion_estado       ON sc_notificaciones.notificacion (estado);
CREATE INDEX idx_notificacion_created      ON sc_notificaciones.notificacion (created_at);

-- 7.3 preferencia_notificacion
CREATE TABLE sc_notificaciones.preferencia_notificacion (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID               NOT NULL REFERENCES sc_users.usuario(id) ON DELETE CASCADE,
    canal        canal_notificacion NOT NULL,
    habilitado   BOOLEAN            NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_preferencia_usuario_canal UNIQUE (usuario_id, canal)
);

CREATE INDEX idx_preferencia_usuario ON sc_notificaciones.preferencia_notificacion (usuario_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 8: TABLAS — sc_dashboard (3 tablas)                           ║
-- ║  Dashboard georreferenciado, KPIs y monitoreo de integraciones         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 8.1 kpi_operativo
CREATE TABLE sc_dashboard.kpi_operativo (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo         tipo_kpi       NOT NULL,
    periodo      VARCHAR(20)    NOT NULL,   -- '2026-04', '2026-W15', '2026-04-12'
    valor        NUMERIC(12, 4) NOT NULL,
    unidad       VARCHAR(30),              -- 'minutos', 'casos', 'porcentaje'
    desglose     JSONB          DEFAULT '{}',
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kpi_tipo_periodo ON sc_dashboard.kpi_operativo (tipo, periodo);
CREATE INDEX idx_kpi_created      ON sc_dashboard.kpi_operativo (created_at);

-- 8.2 reporte_exportado
CREATE TABLE sc_dashboard.reporte_exportado (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo          VARCHAR(200)  NOT NULL,
    formato         VARCHAR(20)   NOT NULL,  -- pdf, xlsx, csv
    filtros         JSONB         DEFAULT '{}',
    ruta_archivo    TEXT          NOT NULL,
    tamano_bytes    BIGINT,
    generado_por_id UUID          NOT NULL REFERENCES sc_users.usuario(id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reporte_generado_por ON sc_dashboard.reporte_exportado (generado_por_id);

-- 8.3 estado_integracion
CREATE TABLE sc_dashboard.estado_integracion (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio         VARCHAR(100)   NOT NULL,   -- 'openai', 'whatsapp', 'google_maps', 'gmail'
    estado           estado_servicio NOT NULL DEFAULT 'DESCONOCIDO',
    ultimo_check     TIMESTAMPTZ,
    tiempo_respuesta_ms INTEGER,
    detalle          JSONB          DEFAULT '{}',
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_integracion_servicio UNIQUE (servicio)
);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 9: TABLAS — sc_lost_found (3 tablas)                          ║
-- ║  Módulo comunitario de objetos perdidos y encontrados                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 9.1 categoria_objeto
CREATE TABLE sc_lost_found.categoria_objeto (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR(100) NOT NULL,
    descripcion  TEXT,
    icono        VARCHAR(50),
    activa       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_categoria_objeto_nombre UNIQUE (nombre)
);

-- 9.2 caso_lost_found
CREATE TABLE sc_lost_found.caso_lost_found (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo           VARCHAR(20)    NOT NULL,
    tipo             tipo_caso_lf   NOT NULL,
    estado           estado_caso_lf NOT NULL DEFAULT 'ABIERTO',
    titulo           VARCHAR(200)   NOT NULL,
    descripcion      TEXT           NOT NULL,
    categoria_id     UUID           REFERENCES sc_lost_found.categoria_objeto(id),
    -- Georreferenciación
    geom             GEOMETRY(Point, 4326),
    lugar_referencia VARCHAR(255),
    -- Fecha del evento
    fecha_evento     TIMESTAMPTZ,
    -- Imagen
    foto_url         TEXT,
    -- Actores
    reportante_id    UUID           NOT NULL REFERENCES sc_users.usuario(id),
    cerrado_por_id   UUID           REFERENCES sc_users.usuario(id),
    -- Metadata
    contacto_info    VARCHAR(255),
    notas            TEXT,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_caso_lf_codigo UNIQUE (codigo)
);

CREATE INDEX idx_caso_lf_tipo       ON sc_lost_found.caso_lost_found (tipo);
CREATE INDEX idx_caso_lf_estado     ON sc_lost_found.caso_lost_found (estado);
CREATE INDEX idx_caso_lf_categoria  ON sc_lost_found.caso_lost_found (categoria_id);
CREATE INDEX idx_caso_lf_reportante ON sc_lost_found.caso_lost_found (reportante_id);
CREATE INDEX idx_caso_lf_geom       ON sc_lost_found.caso_lost_found USING GIST (geom);
CREATE INDEX idx_caso_lf_created    ON sc_lost_found.caso_lost_found (created_at);

-- 9.3 historial_caso_lf
CREATE TABLE sc_lost_found.historial_caso_lf (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id          UUID           NOT NULL REFERENCES sc_lost_found.caso_lost_found(id) ON DELETE CASCADE,
    estado_anterior  estado_caso_lf,
    estado_nuevo     estado_caso_lf NOT NULL,
    accion           VARCHAR(100)   NOT NULL,
    comentario       TEXT,
    ejecutado_por_id UUID           NOT NULL REFERENCES sc_users.usuario(id),
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_lf_caso ON sc_lost_found.historial_caso_lf (caso_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 10: TABLAS — sc_acompanamiento (4 tablas)                     ║
-- ║  Acompañamiento seguro con geolocalización compartida                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 10.1 acompanamiento_seguro
CREATE TABLE sc_acompanamiento.acompanamiento_seguro (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id         UUID                  NOT NULL REFERENCES sc_users.usuario(id),
    estado             estado_acompanamiento NOT NULL DEFAULT 'PENDIENTE',
    -- Origen y destino
    geom_origen        GEOMETRY(Point, 4326) NOT NULL,
    geom_destino       GEOMETRY(Point, 4326) NOT NULL,
    lugar_origen       VARCHAR(255),
    lugar_destino      VARCHAR(255),
    -- Tiempos
    duracion_estimada_min INTEGER,
    fecha_inicio       TIMESTAMPTZ,
    fecha_fin          TIMESTAMPTZ,
    -- Contacto de emergencia
    contacto_emergencia_nombre  VARCHAR(100),
    contacto_emergencia_tel     VARCHAR(20),
    -- Metadata
    notas              TEXT,
    created_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acomp_usuario  ON sc_acompanamiento.acompanamiento_seguro (usuario_id);
CREATE INDEX idx_acomp_estado   ON sc_acompanamiento.acompanamiento_seguro (estado);
CREATE INDEX idx_acomp_origen   ON sc_acompanamiento.acompanamiento_seguro USING GIST (geom_origen);

-- 10.2 ubicacion_trayecto
CREATE TABLE sc_acompanamiento.ubicacion_trayecto (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acomp_id    UUID NOT NULL REFERENCES sc_acompanamiento.acompanamiento_seguro(id) ON DELETE CASCADE,
    geom        GEOMETRY(Point, 4326) NOT NULL,
    precision_metros NUMERIC(10, 2),
    velocidad   NUMERIC(6, 2),
    bearing     NUMERIC(5, 2),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trayecto_acomp ON sc_acompanamiento.ubicacion_trayecto (acomp_id);
CREATE INDEX idx_trayecto_geom  ON sc_acompanamiento.ubicacion_trayecto USING GIST (geom);
CREATE INDEX idx_trayecto_fecha ON sc_acompanamiento.ubicacion_trayecto (created_at);

-- 10.3 alerta_acompanamiento
CREATE TABLE sc_acompanamiento.alerta_acompanamiento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acomp_id        UUID           NOT NULL REFERENCES sc_acompanamiento.acompanamiento_seguro(id) ON DELETE CASCADE,
    tipo            tipo_alerta_as NOT NULL,
    estado          estado_alerta  NOT NULL DEFAULT 'ACTIVA',
    geom            GEOMETRY(Point, 4326),
    mensaje         TEXT,
    atendida_por_id UUID           REFERENCES sc_users.usuario(id),
    fecha_atencion  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerta_acomp  ON sc_acompanamiento.alerta_acompanamiento (acomp_id);
CREATE INDEX idx_alerta_estado ON sc_acompanamiento.alerta_acompanamiento (estado);
CREATE INDEX idx_alerta_geom   ON sc_acompanamiento.alerta_acompanamiento USING GIST (geom);

-- 10.4 evento_acompanamiento
CREATE TABLE sc_acompanamiento.evento_acompanamiento (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acomp_id    UUID           NOT NULL REFERENCES sc_acompanamiento.acompanamiento_seguro(id) ON DELETE CASCADE,
    tipo        tipo_evento_as NOT NULL,
    detalle     JSONB          DEFAULT '{}',
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evento_acomp ON sc_acompanamiento.evento_acompanamiento (acomp_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 11: TABLAS — sc_auditoria (1 tabla)                           ║
-- ║  Log centralizado de acciones del sistema                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE sc_auditoria.registro_auditoria (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     UUID         REFERENCES sc_users.usuario(id),
    accion         VARCHAR(100) NOT NULL,
    modulo         VARCHAR(50)  NOT NULL,
    entidad        VARCHAR(50),
    entidad_id     UUID,
    detalle        JSONB        DEFAULT '{}',
    ip_origen      INET,
    dispositivo    VARCHAR(255),
    fecha_registro TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_usuario ON sc_auditoria.registro_auditoria (usuario_id);
CREATE INDEX idx_auditoria_modulo  ON sc_auditoria.registro_auditoria (modulo);
CREATE INDEX idx_auditoria_fecha   ON sc_auditoria.registro_auditoria (fecha_registro);
CREATE INDEX idx_auditoria_entidad ON sc_auditoria.registro_auditoria (entidad, entidad_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECCIÓN 12: DATOS INICIALES (Seed)                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Roles del sistema
INSERT INTO sc_users.rol (nombre, descripcion, es_sistema) VALUES
    ('comunidad',     'Usuario de la comunidad PUCP (estudiante, profesor, personal)', TRUE),
    ('operador',      'Personal de seguridad — atención operativa en campo',          TRUE),
    ('supervisor',    'Supervisor de seguridad — coordinación y KPIs',                TRUE),
    ('administrador', 'Administrador del sistema — gestión técnica y funcional',       TRUE);

-- Canales de reporte
INSERT INTO sc_omnicanal.canal_reporte (nombre, tipo, activo) VALUES
    ('Aplicación Web (PWA)',  'WEB',        TRUE),
    ('Aplicación Móvil',     'MOVIL',      TRUE),
    ('WhatsApp Business',    'MENSAJERIA', TRUE);

-- Categorías de objetos Lost & Found
INSERT INTO sc_lost_found.categoria_objeto (nombre, descripcion) VALUES
    ('Electrónicos',     'Laptops, celulares, tablets, cargadores, audífonos'),
    ('Documentos',       'DNI, carné universitario, pasaporte, tarjetas'),
    ('Ropa y accesorios','Casacas, mochilas, gorras, lentes, bufandas'),
    ('Llaves',           'Llaves de casa, auto, candado, USB'),
    ('Material académico','Libros, cuadernos, calculadoras, USB'),
    ('Otros',            'Objetos que no encajan en las categorías anteriores');

-- Servicios monitoreados
INSERT INTO sc_dashboard.estado_integracion (servicio, estado) VALUES
    ('openai_api',         'DESCONOCIDO'),
    ('whatsapp_gateway',   'DESCONOCIDO'),
    ('google_maps',        'DESCONOCIDO'),
    ('gmail_oauth',        'DESCONOCIDO'),
    ('push_notifications', 'DESCONOCIDO');

-- Permisos base del sistema
INSERT INTO sc_users.permiso (modulo, accion, descripcion) VALUES
    -- Incidentes
    ('incidentes', 'crear',      'Crear nuevos incidentes'),
    ('incidentes', 'ver',        'Ver incidentes'),
    ('incidentes', 'ver_todos',  'Ver todos los incidentes del sistema'),
    ('incidentes', 'editar',     'Editar incidentes asignados'),
    ('incidentes', 'asignar',    'Asignar operador a incidentes'),
    ('incidentes', 'escalar',    'Escalar incidentes'),
    ('incidentes', 'cerrar',     'Cerrar incidentes'),
    -- Dashboard
    ('dashboard',  'ver',        'Ver dashboard operativo'),
    ('dashboard',  'exportar',   'Exportar reportes'),
    -- Lost & Found
    ('lost_found', 'crear',      'Crear casos de objetos perdidos/encontrados'),
    ('lost_found', 'ver',        'Ver casos Lost & Found'),
    ('lost_found', 'gestionar',  'Gestionar casos (cambiar estado, cerrar)'),
    -- Acompañamiento
    ('acompanamiento', 'solicitar', 'Solicitar acompañamiento seguro'),
    ('acompanamiento', 'monitorear','Monitorear acompañamientos activos'),
    -- Usuarios
    ('usuarios',   'ver',        'Ver lista de usuarios'),
    ('usuarios',   'gestionar',  'Crear, editar y desactivar usuarios'),
    ('usuarios',   'asignar_rol','Asignar roles a usuarios'),
    -- Auditoría
    ('auditoria',  'ver',        'Ver log de auditoría'),
    -- Integraciones
    ('integraciones', 'ver',     'Ver estado de integraciones'),
    ('integraciones', 'gestionar','Configurar integraciones');

-- Asignar permisos a roles (simplificado)
-- Comunidad: crear incidentes, ver propios, lost_found, acompañamiento
INSERT INTO sc_users.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM sc_users.rol r, sc_users.permiso p
WHERE r.nombre = 'comunidad'
  AND (p.modulo, p.accion) IN (
    ('incidentes', 'crear'), ('incidentes', 'ver'),
    ('lost_found', 'crear'), ('lost_found', 'ver'),
    ('acompanamiento', 'solicitar')
  );

-- Operador: gestión operativa de incidentes + monitoreo
INSERT INTO sc_users.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM sc_users.rol r, sc_users.permiso p
WHERE r.nombre = 'operador'
  AND (p.modulo, p.accion) IN (
    ('incidentes', 'ver_todos'), ('incidentes', 'editar'), ('incidentes', 'cerrar'),
    ('dashboard', 'ver'),
    ('lost_found', 'ver'), ('lost_found', 'gestionar'),
    ('acompanamiento', 'monitorear')
  );

-- Supervisor: todo lo del operador + asignar, escalar, exportar
INSERT INTO sc_users.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM sc_users.rol r, sc_users.permiso p
WHERE r.nombre = 'supervisor'
  AND (p.modulo, p.accion) IN (
    ('incidentes', 'ver_todos'), ('incidentes', 'editar'), ('incidentes', 'asignar'),
    ('incidentes', 'escalar'), ('incidentes', 'cerrar'),
    ('dashboard', 'ver'), ('dashboard', 'exportar'),
    ('lost_found', 'ver'), ('lost_found', 'gestionar'),
    ('acompanamiento', 'monitorear'),
    ('auditoria', 'ver')
  );

-- Administrador: todo
INSERT INTO sc_users.rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM sc_users.rol r, sc_users.permiso p
WHERE r.nombre = 'administrador';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VERIFICACIÓN FINAL                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
DECLARE
    v_schemas  INTEGER;
    v_tables   INTEGER;
    v_enums    INTEGER;
    v_indexes  INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_schemas
    FROM information_schema.schemata
    WHERE schema_name LIKE 'sc_%';

    SELECT COUNT(*) INTO v_tables
    FROM information_schema.tables
    WHERE table_schema LIKE 'sc_%' AND table_type = 'BASE TABLE';

    SELECT COUNT(*) INTO v_enums
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typtype = 'e' AND n.nspname = 'public';

    SELECT COUNT(*) INTO v_indexes
    FROM pg_indexes
    WHERE schemaname LIKE 'sc_%';

    RAISE NOTICE '══════════════════════════════════════════';
    RAISE NOTICE '✅ SafeCampus PUCP — Base de datos creada';
    RAISE NOTICE '   Esquemas:  %', v_schemas;
    RAISE NOTICE '   Tablas:    %', v_tables;
    RAISE NOTICE '   ENUMs:     %', v_enums;
    RAISE NOTICE '   Índices:   %', v_indexes;
    RAISE NOTICE '══════════════════════════════════════════';
END $$;