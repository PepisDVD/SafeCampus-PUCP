/**
 * Tipos de ubicación del catálogo maestro.
 * Debe mantenerse alineado con el backend (`app.schemas.maestros.TipoUbicacion`)
 * y la migración `20260514_0018`.
 */
export type TipoUbicacion =
  | "PABELLON"
  | "FACULTAD"
  | "BIBLIOTECA"
  | "LABORATORIO"
  | "AUDITORIO"
  | "CAFETERIA"
  | "AREA_DEPORTIVA"
  | "AREA_COMUN"
  | "ADMINISTRATIVO"
  | "ESTACIONAMIENTO"
  | "ACCESO"
  | "OTRO";

export type UbicacionMaestra = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoUbicacion;
  latitud: number;
  longitud: number;
  activa: boolean;
  /** True si la ubicación está referenciada por otras entidades (no eliminable). */
  tiene_relaciones: boolean;
  created_at: string;
  updated_at: string;
};
