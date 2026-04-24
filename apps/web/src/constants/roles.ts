/**
 * 📁 apps/web/src/constants/roles.ts
 * 🎯 Catálogo de roles, estados de cuenta y estilos visuales del módulo de
 *    Gestión de Usuarios. Alineado con la matriz RBAC v1.0 de SafeCampus.
 * 📦 Capa: Constants
 */

export type RolUsuario = "comunidad" | "operador" | "supervisor" | "admin";

export type EstadoUsuario = "activo" | "inactivo" | "suspendido";

export const ROL_LABELS: Record<RolUsuario, string> = {
  comunidad: "Comunidad",
  operador: "Operador",
  supervisor: "Supervisor",
  admin: "Administrador",
};

export const ROL_DESCRIPCIONES: Record<RolUsuario, string> = {
  comunidad: "Estudiantes, docentes y personal. Reporta incidentes y accede a Lost & Found / acompañamiento seguro.",
  operador: "Atiende y gestiona incidentes desde el tablero operativo.",
  supervisor: "Supervisa operaciones, KPIs y escala incidentes críticos.",
  admin: "Control total del módulo: usuarios, RBAC, integraciones y auditoría.",
};

export const ROL_BADGE_CLASS: Record<RolUsuario, string> = {
  comunidad: "bg-blue-100 text-blue-700",
  operador: "bg-orange-100 text-orange-700",
  supervisor: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

export const ROL_AVATAR_CLASS: Record<RolUsuario, string> = {
  comunidad: "bg-blue-600",
  operador: "bg-orange-600",
  supervisor: "bg-purple-700",
  admin: "bg-red-600",
};

export const ESTADO_LABELS: Record<EstadoUsuario, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
};

export const ESTADO_BADGE_CLASS: Record<EstadoUsuario, string> = {
  activo: "bg-green-100 text-green-700",
  inactivo: "bg-gray-100 text-gray-500",
  suspendido: "bg-red-100 text-red-600",
};

export const ROLES: RolUsuario[] = ["comunidad", "operador", "supervisor", "admin"];

export const ESTADOS: EstadoUsuario[] = ["activo", "inactivo", "suspendido"];
