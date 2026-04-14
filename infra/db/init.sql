-- 📁 infra/db/init.sql
-- 🎯 Inicialización de esquemas y extensiones de PostgreSQL para SafeCampus.
-- 📦 Capa: Infraestructura / Base de datos

-- SafeCampus PUCP — Inicialización de esquemas y extensiones
-- Se ejecuta automáticamente al crear el contenedor

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Esquemas lógicos (9 dominios funcionales)
CREATE SCHEMA IF NOT EXISTS sc_users;
CREATE SCHEMA IF NOT EXISTS sc_omnicanal;
CREATE SCHEMA IF NOT EXISTS sc_incidentes;
CREATE SCHEMA IF NOT EXISTS sc_clasificacion;
CREATE SCHEMA IF NOT EXISTS sc_notificaciones;
CREATE SCHEMA IF NOT EXISTS sc_dashboard;
CREATE SCHEMA IF NOT EXISTS sc_lost_found;
CREATE SCHEMA IF NOT EXISTS sc_acompanamiento;
CREATE SCHEMA IF NOT EXISTS sc_auditoria;

-- Confirmar
DO $$
BEGIN
    RAISE NOTICE '✅ SafeCampus DB inicializada: extensiones y 9 esquemas creados.';
END $$;
