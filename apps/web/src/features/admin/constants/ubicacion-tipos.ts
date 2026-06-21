import type { TipoUbicacion } from "@safecampus/shared-types";

/**
 * Catálogo de tipos de ubicación con su etiqueta legible.
 * Debe mantenerse alineado con el backend (`app.schemas.maestros.TipoUbicacion`).
 */
export const TIPO_UBICACION_OPTIONS: ReadonlyArray<{
  value: TipoUbicacion;
  label: string;
}> = [
  { value: "PABELLON", label: "Pabellón" },
  { value: "FACULTAD", label: "Facultad" },
  { value: "BIBLIOTECA", label: "Biblioteca" },
  { value: "LABORATORIO", label: "Laboratorio" },
  { value: "AUDITORIO", label: "Auditorio" },
  { value: "CAFETERIA", label: "Cafetería" },
  { value: "AREA_DEPORTIVA", label: "Área deportiva" },
  { value: "AREA_COMUN", label: "Área común" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "ESTACIONAMIENTO", label: "Estacionamiento" },
  { value: "ACCESO", label: "Acceso / Puerta" },
  { value: "OTRO", label: "Otro" },
];

const TIPO_LABELS = new Map(
  TIPO_UBICACION_OPTIONS.map((option) => [option.value, option.label]),
);

/** Devuelve la etiqueta legible de un tipo de ubicación. */
export function formatTipoUbicacion(tipo: TipoUbicacion | string): string {
  return TIPO_LABELS.get(tipo as TipoUbicacion) ?? "Otro";
}
