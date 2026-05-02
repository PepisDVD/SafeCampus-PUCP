/**
 * 📁 apps/web/src/features/incidentes/presentation.ts
 * 🎯 Mapeos de presentación reutilizables: severidad → color, estado → badge.
 *    Compartidos entre la tabla operativa y la vista de detalle.
 * 📦 Feature: Incidentes (web)
 */

import { EstadoIncidente, NivelSeveridad, TipoCanal } from "@safecampus/shared-types";

export const SEVERIDAD_COLOR: Record<NivelSeveridad, string> = {
  [NivelSeveridad.CRITICO]: "bg-red-500",
  [NivelSeveridad.ALTO]: "bg-orange-500",
  [NivelSeveridad.MEDIO]: "bg-amber-400",
  [NivelSeveridad.BAJO]: "bg-emerald-500",
};

export const SEVERIDAD_LABEL: Record<NivelSeveridad, string> = {
  [NivelSeveridad.CRITICO]: "Crítico",
  [NivelSeveridad.ALTO]: "Alto",
  [NivelSeveridad.MEDIO]: "Medio",
  [NivelSeveridad.BAJO]: "Bajo",
};

export type EstadoStyle = { label: string; className: string };

export const ESTADO_STYLE: Record<EstadoIncidente, EstadoStyle> = {
  [EstadoIncidente.RECIBIDO]: {
    label: "Nuevo",
    className: "bg-blue-100 text-blue-700",
  },
  [EstadoIncidente.EN_EVALUACION]: {
    label: "En evaluación",
    className: "bg-indigo-100 text-indigo-700",
  },
  [EstadoIncidente.EN_ATENCION]: {
    label: "En atención",
    className: "bg-amber-100 text-amber-800",
  },
  [EstadoIncidente.ESCALADO]: {
    label: "Escalado",
    className: "bg-purple-100 text-purple-700",
  },
  [EstadoIncidente.PENDIENTE_INFO]: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800",
  },
  [EstadoIncidente.RESUELTO]: {
    label: "Resuelto",
    className: "bg-emerald-100 text-emerald-700",
  },
  [EstadoIncidente.CERRADO]: {
    label: "Cerrado",
    className: "bg-slate-200 text-slate-600",
  },
};

export const CANAL_LABEL: Record<TipoCanal, string> = {
  [TipoCanal.WEB]: "Web",
  [TipoCanal.MOVIL]: "Móvil",
  [TipoCanal.MENSAJERIA]: "Mensajería",
};

export function formatCategoria(categoria: string | null): string {
  if (!categoria) return "Sin categoría";
  return categoria.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInitials(nombre: string | null | undefined): string {
  if (!nombre) return "?";
  const parts = nombre.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}