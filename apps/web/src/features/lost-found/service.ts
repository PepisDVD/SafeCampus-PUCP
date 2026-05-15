import { serverApi } from "@/lib/api/server";
import type { CasoLfDetail, CasoLfListItem, CategoriaLf, CustodiaLf, KpisLf, ListResponse, UbicacionMaestra } from "./types";

export async function getLostFoundBootstrap() {
  const [categorias, feed, misCasos, ubicaciones] = await Promise.all([
    serverApi.get<CategoriaLf[]>("/lost-found/categorias"),
    serverApi.get<ListResponse<CasoLfListItem>>("/lost-found/casos/feed"),
    serverApi.get<ListResponse<CasoLfListItem>>("/lost-found/casos/mis"),
    serverApi.get<UbicacionMaestra[]>("/maestros/ubicaciones"),
  ]);
  return { categorias, feed: feed.items, misCasos: misCasos.items, ubicaciones };
}

export async function getLostFoundOperativo() {
  const [casos, custodias, kpis] = await Promise.all([
    serverApi.get<ListResponse<CasoLfListItem>>("/lost-found/casos"),
    serverApi.get<ListResponse<CustodiaLf> & { page: number; per_page: number }>("/lost-found/custodias", { per_page: "8" }),
    serverApi.get<KpisLf>("/lost-found/kpis"),
  ]);
  return { casos: casos.items, custodias: custodias.items, kpis };
}

export async function getLostFoundLogistica() {
  const [custodias, casos] = await Promise.all([
    serverApi.get<ListResponse<CustodiaLf> & { page: number; per_page: number }>("/lost-found/custodias", {
      estado: "ACTIVA",
      page: "1",
      per_page: "10",
    }),
    serverApi.get<ListResponse<CasoLfListItem>>("/lost-found/casos", { tipo: "ENCONTRADO", limit: "100" }),
  ]);
  return { custodias, casos: casos.items };
}

export async function getLostFoundThreads() {
  const [casos, categorias, ubicaciones] = await Promise.all([
    serverApi.get<ListResponse<CasoLfListItem>>("/lost-found/casos"),
    serverApi.get<CategoriaLf[]>("/lost-found/categorias"),
    serverApi.get<UbicacionMaestra[]>("/maestros/ubicaciones"),
  ]);
  return { casos: casos.items, categorias, ubicaciones };
}

export async function getLostFoundThreadDetail(id: string) {
  return serverApi.get<CasoLfDetail>(`/lost-found/casos/${id}`);
}

export async function getLostFoundAdmin() {
  const [categorias, kpis, configuracion] = await Promise.all([
    serverApi.get<CategoriaLf[]>("/lost-found/categorias", { include_inactive: "true" }),
    serverApi.get<KpisLf>("/lost-found/kpis"),
    serverApi.get<Array<{ key: string; value: Record<string, unknown>; descripcion?: string; updated_at: string }>>("/lost-found/configuracion"),
  ]);
  return { categorias, kpis, configuracion };
}
