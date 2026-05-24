export type {
  CasoLfDetail,
  CasoLfListItem,
  CategoriaLf,
  ComentarioLf,
  CustodiaLf,
  KpisLf,
  MatchLf,
  UbicacionMaestra,
} from "@safecampus/shared-types";

export type ListResponse<T> = {
  items: T[];
  total: number;
  next_cursor?: string | null;
};
