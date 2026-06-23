import { api } from "@/lib/api/client";
import type { CasoLfDetail, CasoLfListItem, CategoriaLf, CategoriaLfWritePayload, ComentarioLf, CustodiaLf, CustodiaPoliticaLf, ListResponse, MatchingConfigLf, MatchLf } from "./types";

export type CasoLfCreatePayload = {
  tipo: "PERDIDO" | "ENCONTRADO";
  titulo: string;
  descripcion: string;
  categoria_id: string;
  subcategoria?: string;
  lugar_referencia: string;
  fecha_evento: string;
  hora_aproximada?: string;
  color_principal?: string;
  marca?: string;
  etiquetas?: string[];
  contacto_info?: string;
  latitud?: number | null;
  longitud?: number | null;
};

export const lostFoundClient = {
  feed: (params?: Record<string, string>) =>
    api.get<ListResponse<CasoLfListItem>>("/lost-found/casos/feed", { params }),
  misCasos: () => api.get<ListResponse<CasoLfListItem>>("/lost-found/casos/mis"),
  categorias: () => api.get<CategoriaLf[]>("/lost-found/categorias"),
  crearCaso: (body: CasoLfCreatePayload) =>
    api.post<{ id: string; codigo: string; matches_generados: number }>("/lost-found/casos", normalizeCasePayload(body)),
  detalle: (ref: string) => api.get<CasoLfDetail>(`/lost-found/casos/${ref}`),
  subirFotosArchivos: (id: string, archivos: File[]) => {
    const form = new FormData();
    archivos.forEach((archivo) => form.append("archivos", archivo));
    return api.postMultipart<CasoLfDetail>(`/lost-found/casos/${id}/fotos/upload`, form);
  },
  actualizarFotos: (id: string, body: { foto_url?: string; foto_adicional_urls?: string[] }) =>
    api.post<CasoLfDetail>(`/lost-found/casos/${id}/fotos`, body),
  cancelar: (id: string, observaciones?: string) =>
    api.patch<CasoLfDetail>(`/lost-found/casos/${id}/cancelar`, { observaciones }),
  matches: (casoId: string) => api.get<MatchLf[]>(`/lost-found/casos/${casoId}/matches`),
  responderMatch: (id: string, confirmar: boolean, comentario?: string) =>
    api.post<void>(`/lost-found/matches/${id}/responder`, { confirmar, comentario }),
  comentarios: (casoId: string) => api.get<ComentarioLf[]>(`/lost-found/casos/${casoId}/comentarios`),
  comentar: (casoId: string, contenido: string, parentId?: string | null) =>
    api.post<ComentarioLf>(`/lost-found/casos/${casoId}/comentarios`, { contenido, parent_id: parentId ?? null }),
  eliminarComentario: (id: string) =>
    api.delete<void>(`/lost-found/comentarios/${id}`),
  actualizarParticipacion: (casoId: string, suscrito: boolean, marcarLeido = false) =>
    api.patch<void>(`/lost-found/casos/${casoId}/participacion`, { suscrito, marcar_leido: marcarLeido }),
  moderarComentario: (id: string, visible: boolean, motivo?: string) =>
    api.patch<void>(`/lost-found/comentarios/${id}/visibilidad`, { visible, motivo }),
  casosOperativo: (params?: Record<string, string>) =>
    api.get<ListResponse<CasoLfListItem>>("/lost-found/casos", { params }),
  cambiarEstado: (id: string, estado: string, comentario?: string) =>
    api.patch<CasoLfDetail>(`/lost-found/casos/${id}/estado`, { estado, comentario }),
  registrarCustodia: (id: string, body: { ubicacion_custodia: string; observaciones?: string; es_perecible?: boolean }) =>
    api.post<CustodiaLf>(`/lost-found/casos/${id}/custodia`, body),
  custodias: (params?: Record<string, string>) =>
    api.get<ListResponse<CustodiaLf> & { page: number; per_page: number }>("/lost-found/custodias", { params }),
  actualizarCustodia: (id: string, body: { ubicacion_custodia?: string; observaciones?: string }) =>
    api.patch<CustodiaLf>(`/lost-found/custodias/${id}`, body),
  devolver: (id: string, body: { reclamante_id: string; metodo_verificacion: string; observaciones?: string }) =>
    api.post<void>(`/lost-found/custodias/${id}/devolucion`, body),
  descartar: (id: string, body: { motivo: string; destino_descarte?: string; observaciones?: string }) =>
    api.post<void>(`/lost-found/custodias/${id}/descarte`, body),
  crearCategoria: (body: CategoriaLfWritePayload) => api.post<CategoriaLf>("/lost-found/categorias", body),
  actualizarCategoria: (id: string, body: CategoriaLfWritePayload) =>
    api.patch<CategoriaLf>(`/lost-found/categorias/${id}`, body),
  matchingConfig: () => api.get<MatchingConfigLf>("/lost-found/matching/configuracion"),
  actualizarMatchingConfig: (umbral: number) =>
    api.put<MatchingConfigLf>("/lost-found/matching/configuracion", { umbral }),
  politicaCustodia: () => api.get<CustodiaPoliticaLf>("/lost-found/custodia/politica"),
  actualizarPoliticaCustodia: (body: Omit<CustodiaPoliticaLf, "version">) =>
    api.put<CustodiaPoliticaLf>("/lost-found/custodia/politica", body),
  actualizarConfig: (key: string, body: { value: Record<string, unknown>; descripcion?: string }) =>
    api.patch(`/lost-found/configuracion/${key}`, body),
};

function normalizeCasePayload(body: CasoLfCreatePayload): CasoLfCreatePayload {
  return {
    ...body,
    titulo: body.titulo.trim(),
    descripcion: body.descripcion.trim(),
    categoria_id: body.categoria_id.trim(),
    subcategoria: clean(body.subcategoria),
    lugar_referencia: body.lugar_referencia.trim(),
    color_principal: clean(body.color_principal),
    marca: clean(body.marca),
    contacto_info: clean(body.contacto_info),
    etiquetas: body.etiquetas?.map((item) => item.trim()).filter(Boolean) ?? [],
  };
}

function clean(value?: string) {
  const text = value?.trim();
  return text || undefined;
}
