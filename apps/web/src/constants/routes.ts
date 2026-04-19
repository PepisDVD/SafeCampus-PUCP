/**
 * 📁 apps/web/src/constants/routes.ts
 * 🎯 Mapa de rutas del sistema organizado por familia de interfaz (auth, comunidad, operativo, admin).
 * 📦 Capa: Constants
 */

export const ROUTES = {
  // Auth
  LOGIN: "/login",

  // Comunidad (PWA)
  REPORTAR: "/reportar",
  MIS_CASOS: "/mis-casos",
  LOST_FOUND: "/lost-found",
  ACOMPANAMIENTO: "/acompanamiento",

  // Operativo
  DASHBOARD: "/dashboard",
  INCIDENTES: "/incidentes",
  INCIDENTE_DETALLE: (id: string) => `/incidentes/${id}`,
  MENSAJES: "/mensajes",
  MAPA: "/mapa",
  KPIS: "/kpis",

  // Admin
  USUARIOS: "/usuarios",
  ROLES: "/roles",
  INTEGRACIONES: "/integraciones",
  AUDITORIA: "/auditoria",
} as const;
