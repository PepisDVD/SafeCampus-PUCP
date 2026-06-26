/** Tipo de ubicacion del catalogo maestro. Puede ser base o creado por administracion. */
export type TipoUbicacion = string;

export type UbicacionMaestra = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoUbicacion;
  latitud: number;
  longitud: number;
  activa: boolean;
  /** True si la ubicacion esta referenciada por otras entidades (no eliminable). */
  tiene_relaciones: boolean;
  created_at: string;
  updated_at: string;
};
