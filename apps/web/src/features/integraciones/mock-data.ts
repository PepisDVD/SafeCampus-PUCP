/**
 * 📁 apps/web/src/features/integraciones/mock-data.ts
 * 🎯 Semilla de integraciones externas monitoreadas por el admin.
 *    Cada integración mantiene su último estado conocido y timestamp
 *    de verificación; las acciones "verificar" escriben encima.
 * 📦 Feature: Integraciones
 */

import type { Integracion } from "./types";

export const INTEGRACIONES_MOCK: Integracion[] = [
  {
    id: "INT-WHATSAPP",
    nombre: "WhatsApp Business API",
    descripcion: "Canal omnicanal de reportes y alertas a la comunidad PUCP.",
    categoria: "mensajeria",
    estado: "operativo",
    ultimaVerificacion: "2026-04-17 08:40",
    latenciaMs: 312,
    mensajeEstado: "Webhooks entregando en < 500 ms.",
  },
  {
    id: "INT-OPENAI",
    nombre: "OpenAI API",
    descripcion: "Clasificación automática de incidentes y sugerencias de triage.",
    categoria: "ia",
    estado: "operativo",
    ultimaVerificacion: "2026-04-19 06:10",
    latenciaMs: 842,
    mensajeEstado: "Modelo gpt-4o-mini respondiendo correctamente.",
  },
  {
    id: "INT-MAPS",
    nombre: "Google Maps Platform",
    descripcion: "Mapas y geocoding para dashboard georreferenciado.",
    categoria: "mapas",
    estado: "degradado",
    ultimaVerificacion: "2026-04-18 21:12",
    latenciaMs: 1875,
    mensajeEstado: "Throttling por cuota horaria — se recomienda revisar plan.",
  },
  {
    id: "INT-GMAIL",
    nombre: "Gmail OAuth2",
    descripcion: "Envío de notificaciones y verificación de correos institucionales.",
    categoria: "correo",
    estado: "operativo",
    ultimaVerificacion: "2026-04-19 05:00",
    latenciaMs: 421,
    mensajeEstado: "Token de servicio válido hasta 2026-05-02.",
  },
  {
    id: "INT-GOOGLE-SSO",
    nombre: "Google Workspace SSO",
    descripcion: "Login con cuentas @pucp.edu.pe (proveedor de identidad).",
    categoria: "autenticacion",
    estado: "operativo",
    ultimaVerificacion: "2026-04-19 07:30",
    latenciaMs: 287,
    mensajeEstado: "Flujo OAuth en orden. Dominio permitido: pucp.edu.pe.",
  },
  {
    id: "INT-SUPABASE",
    nombre: "Supabase (DB + Storage)",
    descripcion: "Persistencia de incidentes, usuarios y archivos adjuntos.",
    categoria: "autenticacion",
    estado: "operativo",
    ultimaVerificacion: "2026-04-19 07:35",
    latenciaMs: 132,
    mensajeEstado: "Pool de conexiones estable. Migraciones Alembic al día.",
  },
];
