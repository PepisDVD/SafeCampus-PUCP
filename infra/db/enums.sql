-- 📁 infra/db/enums.sql
-- 🎯 Crear los 18 tipos ENUM de PostgreSQL que restringen valores del modelo canónico.
-- 📦 Capa: Infraestructura / Base de datos

-- SafeCampus PUCP — 18 tipos ENUM del modelo canónico

-- sc_users
CREATE TYPE estado_usuario AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');
CREATE TYPE estado_sesion AS ENUM ('ACTIVA', 'EXPIRADA', 'REVOCADA');
CREATE TYPE tipo_dispositivo AS ENUM ('WEB', 'MOVIL', 'TABLET');

-- sc_omnicanal
CREATE TYPE tipo_canal AS ENUM ('WEB', 'MOVIL', 'MENSAJERIA');
CREATE TYPE estado_reporte AS ENUM ('RECIBIDO', 'NORMALIZADO', 'ENRUTADO', 'ERROR');

-- sc_incidentes
CREATE TYPE estado_incidente AS ENUM ('RECIBIDO', 'EN_EVALUACION', 'EN_ATENCION', 'ESCALADO', 'PENDIENTE_INFO', 'RESUELTO', 'CERRADO');
CREATE TYPE nivel_severidad AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- sc_clasificacion
CREATE TYPE origen_clasificacion AS ENUM ('IA', 'REGLA', 'FALLBACK', 'HUMANO');

-- sc_notificaciones
CREATE TYPE canal_notificacion AS ENUM ('EMAIL', 'PUSH', 'SMS', 'WHATSAPP', 'INAPP');
CREATE TYPE estado_notificacion AS ENUM ('PENDIENTE', 'ENVIADA', 'FALLIDA', 'DESCARTADA');

-- sc_dashboard
CREATE TYPE tipo_kpi AS ENUM ('FRT', 'TMR', 'VOLUMEN', 'DISTRIBUCION', 'TASA_RESOLUCION');

-- sc_lost_found
CREATE TYPE tipo_caso_lf AS ENUM ('PERDIDO', 'ENCONTRADO');
CREATE TYPE estado_caso_lf AS ENUM ('ABIERTO', 'EN_REVISION', 'DEVUELTO', 'DESCARTADO', 'CERRADO');

-- sc_acompanamiento
CREATE TYPE estado_acompanamiento AS ENUM ('PENDIENTE', 'ACTIVO', 'ALERTA', 'FINALIZADO', 'CANCELADO');
CREATE TYPE tipo_alerta_as AS ENUM ('MANUAL', 'VENCIMIENTO', 'DESCONEXION');
CREATE TYPE estado_alerta AS ENUM ('ACTIVA', 'ATENDIDA', 'CANCELADA');
CREATE TYPE tipo_evento_as AS ENUM ('INICIO', 'ALERTA', 'DESCONEXION', 'RECONEXION', 'FIN', 'CANCELACION');

-- sc_dashboard (monitoreo)
CREATE TYPE estado_servicio AS ENUM ('OK', 'DEGRADADO', 'CAIDO', 'DESCONOCIDO');

DO $$
BEGIN
    RAISE NOTICE '✅ 18 tipos ENUM creados correctamente.';
END $$;
