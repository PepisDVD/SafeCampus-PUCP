import type { EstadoCasoLF, TipoCasoLF } from "@safecampus/shared-types";

const PERU_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Lima",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Tonos (colores) compartidos a nivel de módulo para los estados de Lost & Found.
 * Cubre estados de caso (hilo) y estados de custodia (logística), de modo que
 * todos los submódulos reutilicen el mismo diseño en lugar de versiones propias.
 */
export const estadoLfTone: Record<string, string> = {
  // Estados de caso (hilo)
  ABIERTO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EN_REVISION: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMADO: "bg-orange-50 text-orange-700 border-orange-200",
  EN_CUSTODIA: "bg-sky-50 text-sky-700 border-sky-200",
  DEVUELTO: "bg-teal-50 text-teal-700 border-teal-200",
  DESCARTADO: "bg-rose-50 text-rose-700 border-rose-200",
  CERRADO: "bg-slate-100 text-slate-600 border-slate-200",
  // Estados de custodia (logística)
  ACTIVA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROXIMA_VENCER: "bg-amber-50 text-amber-700 border-amber-200",
  VENCIDA: "bg-rose-50 text-rose-700 border-rose-200",
  DEVUELTA: "bg-teal-50 text-teal-700 border-teal-200",
  DESCARTADA: "bg-slate-100 text-slate-600 border-slate-200",
};

export const ESTADO_LF_FALLBACK_TONE = "border-slate-200 bg-slate-50 text-slate-600";

export function tipoLabel(tipo: TipoCasoLF | string) {
  return tipo === "PERDIDO" ? "Perdido" : "Encontrado";
}

export function estadoLabel(estado: EstadoCasoLF | string) {
  return estado.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDateTimePe(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  const parts = Object.fromEntries(
    PERU_DATE_TIME_FORMATTER
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.hour);
  const period = hour < 12 ? "a. m." : "p. m.";
  const hour12 = hour % 12 || 12;

  return `${parts.day}/${parts.month}/${parts.year}, ${String(hour12).padStart(2, "0")}:${parts.minute} ${period}`;
}

// ───────────────────────────── Etiquetas de comentarios ─────────────────────────────

export type LfCommentTag = {
  value: string;
  label: string;
  prioridad: number; // 0 general · 1 media · 2 alta (destacado)
  badgeClassName: string;
};

const TAG_GENERAL: LfCommentTag = {
  value: "GENERAL",
  label: "Comentario general",
  prioridad: 0,
  badgeClassName: "border-slate-200 bg-slate-50 text-slate-600",
};

const TAGS_PERDIDO: LfCommentTag[] = [
  TAG_GENERAL,
  { value: "POSIBLE_HALLAZGO", label: "Creo que lo encontré", prioridad: 2, badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "PISTA", label: "Tengo una pista sobre el objeto", prioridad: 1, badgeClassName: "border-amber-200 bg-amber-50 text-amber-700" },
];

const TAGS_ENCONTRADO: LfCommentTag[] = [
  TAG_GENERAL,
  { value: "RECLAMO", label: "Creo que es mío / Quiero reclamarlo", prioridad: 2, badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "INFO_UTIL", label: "Tengo información útil", prioridad: 1, badgeClassName: "border-sky-200 bg-sky-50 text-sky-700" },
];

/** Etiquetas disponibles para el composer según el tipo del hilo. */
export function tagsForTipo(tipo: TipoCasoLF | string): LfCommentTag[] {
  return tipo === "ENCONTRADO" ? TAGS_ENCONTRADO : TAGS_PERDIDO;
}

const ALL_TAGS: LfCommentTag[] = [
  TAG_GENERAL,
  ...TAGS_PERDIDO.slice(1),
  ...TAGS_ENCONTRADO.slice(1),
];

/** Metadatos de una etiqueta (color + label). `null`/GENERAL → etiqueta general. */
export function tagMeta(tag?: string | null): LfCommentTag {
  if (!tag) return TAG_GENERAL;
  return ALL_TAGS.find((t) => t.value === tag) ?? TAG_GENERAL;
}

export const DEFAULT_TAG = TAG_GENERAL.value;
