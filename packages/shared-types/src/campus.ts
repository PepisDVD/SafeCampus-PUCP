/**
 * Coordenadas operativas de zonas conocidas del campus PUCP.
 *
 * Se usan como ubicacion aproximada cuando el usuario selecciona una zona pero
 * no comparte GPS preciso.
 */

export interface CampusZoneLocation {
  id: string;
  label: string;
  latitud: number;
  longitud: number;
}

export const CAMPUS_ZONE_LOCATIONS = [
  {
    id: "biblioteca_central",
    label: "Biblioteca Central",
    latitud: -12.06944,
    longitud: -77.08066,
  },
  {
    id: "pabellon_a",
    label: "Pabellon A",
    latitud: -12.07076,
    longitud: -77.0801,
  },
  {
    id: "pabellon_h",
    label: "Pabellon H",
    latitud: -12.06845,
    longitud: -77.08167,
  },
  {
    id: "cafeteria_central",
    label: "Cafeteria Central",
    latitud: -12.06986,
    longitud: -77.08117,
  },
  {
    id: "patio_de_letras",
    label: "Patio de Letras",
    latitud: -12.0702,
    longitud: -77.08075,
  },
  {
    id: "estacionamiento_principal",
    label: "Estacionamiento Principal",
    latitud: -12.06804,
    longitud: -77.07915,
  },
] as const satisfies readonly CampusZoneLocation[];

export type CampusZoneId = (typeof CAMPUS_ZONE_LOCATIONS)[number]["id"];
