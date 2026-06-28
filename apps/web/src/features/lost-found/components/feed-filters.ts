/**
 * Estado y helpers de los filtros del feed comunitario de Lost & Found.
 * Compartido entre el componente principal, el Drawer de filtros avanzados y
 * el selector de ubicación por mapa.
 */

export type CommunityFilters = {
  search: string;
  tipo: "" | "PERDIDO" | "ENCONTRADO";
  categoria_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  /** Clave del preset de tiempo activo (frescura por `created_at`). */
  timePreset: string;
  /** Filtros por metadatos de la categoría seleccionada. */
  metadatos: Record<string, string>;
  /** Ubicación seleccionada en el mapa (centro del radio). */
  lat: number | null;
  lng: number | null;
  radio_km: number | null;
};

export const emptyCommunityFilters: CommunityFilters = {
  search: "",
  tipo: "",
  categoria_id: "",
  fecha_desde: "",
  fecha_hasta: "",
  timePreset: "",
  metadatos: {},
  lat: null,
  lng: null,
  radio_km: null,
};

export type TimePreset = { value: string; label: string };

/** Opciones de tiempo coherentes para el filtro rápido (basadas en publicación). */
export const TIME_PRESETS: TimePreset[] = [
  { value: "", label: "Cualquier momento" },
  { value: "1h", label: "Última hora" },
  { value: "today", label: "Hoy" },
  { value: "24h", label: "Últimas 24 h" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
];

/** Convierte el preset de tiempo en un instante ISO (`publicado_desde`). */
export function resolvePublicadoDesde(preset: string): string {
  const now = new Date();
  switch (preset) {
    case "1h":
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return "";
  }
}

/** Serializa los filtros a query params del endpoint `/casos/feed`. */
export function toFeedParams(filters: CommunityFilters, cursor?: string | null): Record<string, string> {
  const metadatosActivos = Object.fromEntries(
    Object.entries(filters.metadatos).filter(([, value]) => value.trim()),
  );
  const hasLocation = filters.lat !== null && filters.lng !== null && filters.radio_km !== null;
  const entries: Record<string, string> = {
    search: filters.search,
    tipo: filters.tipo,
    categoria_id: filters.categoria_id,
    fecha_desde: filters.fecha_desde ? new Date(filters.fecha_desde).toISOString() : "",
    fecha_hasta: filters.fecha_hasta ? new Date(`${filters.fecha_hasta}T23:59:59`).toISOString() : "",
    publicado_desde: resolvePublicadoDesde(filters.timePreset),
    lat: hasLocation ? String(filters.lat) : "",
    lng: hasLocation ? String(filters.lng) : "",
    radio_km: hasLocation ? String(filters.radio_km) : "",
    metadatos: Object.keys(metadatosActivos).length ? JSON.stringify(metadatosActivos) : "",
    cursor: cursor ?? "",
  };
  return Object.fromEntries(Object.entries(entries).filter(([, value]) => value)) as Record<string, string>;
}

/** Cantidad de filtros avanzados activos (para el badge del botón "Filtros"). */
export function countAdvancedFilters(filters: CommunityFilters): number {
  let count = 0;
  if (filters.tipo) count += 1;
  if (filters.categoria_id) count += 1;
  if (filters.fecha_desde) count += 1;
  if (filters.fecha_hasta) count += 1;
  count += Object.values(filters.metadatos).filter((value) => value.trim()).length;
  return count;
}
