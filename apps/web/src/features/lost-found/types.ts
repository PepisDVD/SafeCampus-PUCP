export type {
  CasoLfDetail,
  CasoLfListItem,
  CategoriaLf,
  ComentarioLf,
  CustodiaLf,
  CustodiaPoliticaLf,
  DashboardLf,
  KpisLf,
  MatchLf,
  MatchingConfigLf,
  MotivoCierreLf,
  MetadatoCampoLf,
  MetadatosSchemaLf,
  MetadatoTipoLf,
  SupervisorLf,
  UbicacionMaestra,
} from "@safecampus/shared-types";

export type CategoriaLfWritePayload = {
  codigo?: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  activa: boolean;
  es_perecible: boolean;
  orden_visual?: number;
  metadatos_schema?: import("@safecampus/shared-types").MetadatosSchemaLf | null;
};

export type MotivoCierreLfWritePayload = Omit<import("@safecampus/shared-types").MotivoCierreLf, "id" | "codigo_bloqueado">;

export type ListResponse<T> = {
  items: T[];
  total: number;
  next_cursor?: string | null;
};
