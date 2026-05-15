export type {
  CasoLfDetail,
  CasoLfListItem,
  CategoriaLf,
  ComentarioLf,
  CustodiaLf,
  KpisLf,
  MatchLf,
} from "@safecampus/shared-types";

export type ListResponse<T> = {
  items: T[];
  total: number;
};

