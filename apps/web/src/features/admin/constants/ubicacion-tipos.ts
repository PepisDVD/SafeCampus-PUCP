import type { TipoUbicacion } from "@safecampus/shared-types";

/**
 * Catalogo base de tipos de ubicacion. Los administradores pueden crear nuevos
 * tipos desde la opcion "Otro"; luego aparecen junto a estos valores base.
 */
export const TIPO_UBICACION_OPTIONS: ReadonlyArray<{
  value: TipoUbicacion;
  label: string;
}> = [
  { value: "PABELLON", label: "Pabellon" },
  { value: "FACULTAD", label: "Facultad" },
  { value: "BIBLIOTECA", label: "Biblioteca" },
  { value: "LABORATORIO", label: "Laboratorio" },
  { value: "AUDITORIO", label: "Auditorio" },
  { value: "CAFETERIA", label: "Cafeteria" },
  { value: "AREA_DEPORTIVA", label: "Area deportiva" },
  { value: "AREA_COMUN", label: "Area comun" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "ESTACIONAMIENTO", label: "Estacionamiento" },
  { value: "ACCESO", label: "Acceso / Puerta" },
  { value: "OTRO", label: "Otro" },
];

const TIPO_LABELS = new Map(
  TIPO_UBICACION_OPTIONS.map((option) => [option.value, option.label]),
);

/** Devuelve la etiqueta legible de un tipo de ubicacion. */
export function formatTipoUbicacion(tipo: TipoUbicacion | string): string {
  const known = TIPO_LABELS.get(tipo as TipoUbicacion);
  if (known) return known;
  return String(tipo)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ") || "Otro";
}
