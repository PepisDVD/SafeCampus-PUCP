"use client";

import { cn } from "@safecampus/ui-kit";

/**
 * Límites de los campos de texto del hilo, alineados con el backend
 * (app/schemas/lost_found.py · CasoLfCreateInput / CasoLfUpdateInput) y la BD.
 */
export const LF_TEXT_LIMITS = {
  titulo: { min: 3, max: 200 },
  descripcion: { min: 10, max: 4000 },
  lugar_referencia: { min: 3, max: 255 },
  subcategoria: { min: 0, max: 100 },
  color_principal: { min: 0, max: 50 },
  marca: { min: 0, max: 100 },
  contacto_info: { min: 0, max: 255 },
  custodia_ubicacion: { min: 2, max: 255 },
  custodia_observaciones: { min: 0, max: 2000 },
  descarte_motivo_otro: { min: 3, max: 1000 },
  descarte_destino: { min: 0, max: 150 },
  descarte_observaciones: { min: 0, max: 2000 },
} as const;

const NEAR_LIMIT = 0.9;

/**
 * Contador de caracteres con ayuda visual ligera: gris normal, ámbar al
 * acercarse al límite (≥90%) y rojo si lo supera. Muestra el mínimo pendiente.
 */
export function CharCounter({
  value,
  min,
  max,
  className,
}: {
  value: string;
  min?: number;
  max: number;
  className?: string;
}) {
  const len = value.length;
  const ratio = max > 0 ? len / max : 0;
  const tone = len > max ? "text-rose-600" : ratio >= NEAR_LIMIT ? "text-amber-600" : "text-slate-400";
  const trimmed = value.trim().length;
  const belowMin = min != null && min > 0 && trimmed > 0 && trimmed < min;
  return (
    <div className={cn("flex items-center justify-between text-[11px]", className)}>
      <span className="text-amber-600">{belowMin ? `Mínimo ${min} caracteres` : ""}</span>
      <span className={cn("tabular-nums", tone)}>{len}/{max}</span>
    </div>
  );
}
