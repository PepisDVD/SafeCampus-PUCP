/**
 * 📁 apps/web/src/constants/permissions.ts
 * 🎯 Matriz RBAC v1.0 — permisos por rol y grupo funcional.
 *    Fuente: "Matriz RBAC principal" + "Control de acceso resumido por módulo".
 * 📦 Capa: Constants
 */

import type { RolUsuario } from "./roles";

export type NivelPermiso = "si" | "no" | "parcial" | "consulta";

export type GrupoFuncional =
  | "autenticacion"
  | "incidentes"
  | "dashboard"
  | "kpis"
  | "alertas"
  | "lost_found"
  | "acompanamiento"
  | "whatsapp"
  | "integraciones_tecnicas"
  | "usuarios"
  | "auditoria";

export interface PermisoRBAC {
  modulo: string;
  grupo: GrupoFuncional;
  permisos: Record<RolUsuario, NivelPermiso>;
}

export const GRUPO_LABELS: Record<GrupoFuncional, string> = {
  autenticacion: "Autenticación y perfil",
  incidentes: "Gestión de incidentes y expediente único",
  dashboard: "Dashboard georreferenciado",
  kpis: "KPIs y reportes",
  alertas: "Alertas y notificaciones",
  lost_found: "Lost & Found",
  acompanamiento: "Acompañamiento seguro",
  whatsapp: "Integraciones y WhatsApp",
  integraciones_tecnicas: "Integraciones técnicas",
  usuarios: "Gestión de usuarios y seguridad",
  auditoria: "Auditoría",
};

export const NIVEL_LABEL: Record<NivelPermiso, string> = {
  si: "Sí",
  no: "No",
  parcial: "Parcial",
  consulta: "Consulta",
};

export const NIVEL_BADGE_CLASS: Record<NivelPermiso, string> = {
  si: "bg-green-100 text-green-700",
  no: "bg-gray-100 text-gray-400",
  parcial: "bg-amber-100 text-amber-700",
  consulta: "bg-blue-100 text-blue-700",
};

/**
 * Matriz RBAC por módulo. Basada en el resumen v1.0.
 * Las acciones granulares (visualizar/ejecutar/modificar/etc.) viven dentro
 * de cada feature cuando se requiera un control más fino.
 */
export const RBAC_MATRIZ: PermisoRBAC[] = [
  {
    modulo: "Autenticación y perfil",
    grupo: "autenticacion",
    permisos: { comunidad: "si", operador: "si", supervisor: "si", admin: "si" },
  },
  {
    modulo: "Gestión de incidentes y expediente único",
    grupo: "incidentes",
    permisos: { comunidad: "parcial", operador: "si", supervisor: "si", admin: "parcial" },
  },
  {
    modulo: "Dashboard georreferenciado",
    grupo: "dashboard",
    permisos: { comunidad: "no", operador: "si", supervisor: "si", admin: "consulta" },
  },
  {
    modulo: "KPIs y reportes",
    grupo: "kpis",
    permisos: { comunidad: "no", operador: "no", supervisor: "si", admin: "si" },
  },
  {
    modulo: "Alertas y notificaciones",
    grupo: "alertas",
    permisos: { comunidad: "si", operador: "si", supervisor: "consulta", admin: "consulta" },
  },
  {
    modulo: "Lost & Found",
    grupo: "lost_found",
    permisos: { comunidad: "si", operador: "parcial", supervisor: "parcial", admin: "si" },
  },
  {
    modulo: "Acompañamiento seguro",
    grupo: "acompanamiento",
    permisos: { comunidad: "si", operador: "no", supervisor: "parcial", admin: "no" },
  },
  {
    modulo: "Integraciones y WhatsApp",
    grupo: "whatsapp",
    permisos: { comunidad: "no", operador: "si", supervisor: "si", admin: "parcial" },
  },
  {
    modulo: "Integraciones técnicas",
    grupo: "integraciones_tecnicas",
    permisos: { comunidad: "no", operador: "no", supervisor: "parcial", admin: "si" },
  },
  {
    modulo: "Gestión de usuarios y seguridad",
    grupo: "usuarios",
    permisos: { comunidad: "no", operador: "no", supervisor: "no", admin: "si" },
  },
  {
    modulo: "Auditoría",
    grupo: "auditoria",
    permisos: { comunidad: "no", operador: "no", supervisor: "parcial", admin: "si" },
  },
];

/**
 * Ayuda rápida para comprobar si un rol puede entrar al panel de admin.
 * Solo el Administrador del sistema tiene acceso total al módulo.
 */
export function puedeAccederAdminPanel(rol: RolUsuario): boolean {
  return rol === "admin";
}
