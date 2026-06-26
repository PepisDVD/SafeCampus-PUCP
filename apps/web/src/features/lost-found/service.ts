import { serverApi } from "@/lib/api/server";
import { listarUsuarios, type UsuarioConRoles } from "@/features/admin/services/usuario.service";
import type { CasoLfDetail, CasoLfListItem, CategoriaLf, CustodiaLf, CustodiaPoliticaLf, DashboardLf, ListResponse, MatchingConfigLf, MatchLf, MotivoCierreLf, UbicacionMaestra } from "./types";

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
  const fechaHasta = new Date();
  const fechaDesde = new Date(fechaHasta);
  fechaDesde.setDate(fechaDesde.getDate() - 41);
  const filters = {
    fecha_desde: fechaDesde.toISOString().slice(0, 10),
    fecha_hasta: fechaHasta.toISOString().slice(0, 10),
  };
  const [dashboard, categorias] = await Promise.all([
    serverApi.get<DashboardLf>("/lost-found/dashboard", filters),
    serverApi.get<CategoriaLf[]>("/lost-found/categorias"),
  ]);
  return { dashboard, categorias, initialFilters: filters };
}

export async function getLostFoundLogistica(filters?: { search?: string }) {
  const search = filters?.search?.trim();
  const [custodias, casos, motivosCierre, ubicaciones, usuariosResult] = await Promise.all([
    serverApi.get<ListResponse<CustodiaLf> & { page: number; per_page: number }>("/lost-found/custodias", {
      estado: "ACTIVA,PROXIMA_VENCER,VENCIDA",
      ...(search ? { search } : {}),
      page: "1",
      per_page: "10",
    }),
    serverApi.get<ListResponse<CasoLfListItem>>("/lost-found/casos", { tipo: "ENCONTRADO", limit: "100" }),
    serverApi.get<MotivoCierreLf[]>("/lost-found/motivos-cierre"),
    serverApi.get<UbicacionMaestra[]>("/maestros/ubicaciones", { include_inactive: "false" }),
    listarUsuarios({ estado: "ACTIVO" }).then(
      (response) => ({ status: "fulfilled" as const, value: response.items }),
      () => ({ status: "rejected" as const, value: [] as UsuarioConRoles[] }),
    ),
  ]);
  return {
    custodias,
    casos: casos.items,
    initialSearch: search ?? "",
    ubicacionesCustodia: ubicaciones.filter((ubicacion) => ubicacion.activa && ubicacion.tipo.toLowerCase() === "custodia"),
    usuarios: usuariosResult.value,
    motivosDescarte: motivosCierre.filter((motivo) => motivo.clase_cierre === "DESCARTE" && motivo.activo),
  };
}

export async function getLostFoundThreads() {
  const [casos, categorias, ubicaciones] = await Promise.all([
    serverApi.get<ListResponse<CasoLfListItem>>("/lost-found/casos", { limit: "12" }),
    serverApi.get<CategoriaLf[]>("/lost-found/categorias"),
    serverApi.get<UbicacionMaestra[]>("/maestros/ubicaciones"),
  ]);
  return { casos: casos.items, nextCursor: casos.next_cursor ?? null, categorias, ubicaciones };
}

export async function getLostFoundThreadDetail(id: string) {
  return serverApi.get<CasoLfDetail>(`/lost-found/casos/${id}`);
}

export async function getLostFoundAccess(): Promise<boolean> {
  try {
    const { acceso } = await serverApi.get<{ acceso: boolean }>("/lost-found/acceso/mi");
    return Boolean(acceso);
  } catch {
    return false;
  }
}

export async function getLostFoundThreadMatches(id: string) {
  return serverApi.get<MatchLf[]>(`/lost-found/casos/${id}/matches`);
}

export async function getLostFoundAdmin() {
  const [categorias, matchingConfig, politicaCustodia, motivosCierre] = await Promise.all([
    serverApi.get<CategoriaLf[]>("/lost-found/categorias", { include_inactive: "true" }),
    serverApi.get<MatchingConfigLf>("/lost-found/matching/configuracion"),
    serverApi.get<CustodiaPoliticaLf>("/lost-found/custodia/politica"),
    serverApi.get<MotivoCierreLf[]>("/lost-found/motivos-cierre", { include_inactive: "true" }),
  ]);
  return { categorias, matchingConfig, politicaCustodia, motivosCierre };
}
