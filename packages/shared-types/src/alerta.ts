import {
  CanalNotificacion,
  EstadoAlertaCampus,
  EstadoNotificacion,
  NivelSeveridad,
  OrigenAlerta,
  TipoSegmentoAlerta,
} from "./enums";

export interface AlertaSegmentoInput {
  tipo: TipoSegmentoAlerta;
  valor: string;
  usuario_id?: string | null;
  ubicacion_id?: string | null;
  radio_metros?: number | null;
}

export interface AlertaCreateInput {
  tipo?: string;
  familia?: string;
  titulo: string;
  contenido: string;
  severidad: NivelSeveridad;
  origen?: OrigenAlerta;
  canales: CanalNotificacion[];
  zona_id?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  radio_metros?: number | null;
  fecha_programada?: string | null;
  fecha_fin?: string | null;
  segmentos: AlertaSegmentoInput[];
}

export interface AlertaUpdateInput extends Partial<AlertaCreateInput> {}

export interface AlertaEstadoInput {
  comentario?: string | null;
}

export interface AlertaSegmentoItem {
  id: string;
  tipo: TipoSegmentoAlerta;
  valor: string;
  usuario_id: string | null;
  ubicacion_id: string | null;
  radio_metros: number | null;
}

export interface AlertaEntregaItem {
  id: string;
  destinatario_id: string | null;
  destinatario_nombre: string | null;
  destinatario_email: string | null;
  canal: CanalNotificacion;
  estado: EstadoNotificacion;
  error_detalle: string | null;
  fecha_envio: string | null;
  created_at: string;
}

export interface AlertaEventoItem {
  id: string;
  tipo_evento: string;
  actor_usuario_id: string | null;
  actor_nombre: string | null;
  detalle: Record<string, unknown>;
  created_at: string;
}

export interface AlertaListItem {
  id: string;
  codigo: string;
  tipo: string;
  familia: string;
  titulo: string;
  contenido: string;
  severidad: NivelSeveridad;
  estado: EstadoAlertaCampus;
  origen: OrigenAlerta;
  canales: CanalNotificacion[];
  zona_id: string | null;
  zona_nombre: string | null;
  latitud: number | null;
  longitud: number | null;
  radio_metros: number | null;
  fecha_programada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  entregas_total: number;
  entregas_enviadas: number;
  entregas_fallidas: number;
}

export interface AlertaDetail extends AlertaListItem {
  segmentos: AlertaSegmentoItem[];
  entregas: AlertaEntregaItem[];
  eventos: AlertaEventoItem[];
}

export interface AlertaListResponse {
  items: AlertaListItem[];
  total: number;
}

export interface AlertaPublishResponse {
  alerta: AlertaDetail;
  destinatarios: number;
  entregas_creadas: number;
  entregas_enviadas: number;
  entregas_fallidas: number;
}

export interface AlertasStatsResponse {
  total: number;
  por_estado: Record<string, number>;
  por_canal: Record<string, number>;
  por_severidad: Record<string, number>;
  entregas_total: number;
  entregas_enviadas: number;
  entregas_fallidas: number;
}

export interface GisNearbyItem {
  tipo: string;
  id: string;
  codigo: string | null;
  titulo: string;
  estado: string | null;
  severidad: string | null;
  latitud: number;
  longitud: number;
  distancia_metros: number;
}

export interface GisNearbyResponse {
  items: GisNearbyItem[];
  total: number;
}

export interface GisHeatmapPoint {
  tipo: string;
  latitud: number;
  longitud: number;
  peso: number;
  total: number;
}

export interface GisHeatmapResponse {
  points: GisHeatmapPoint[];
  total: number;
}

export interface GisRouteResponse {
  origen_id: string;
  destino_id: string;
  origen_nombre: string;
  destino_nombre: string;
  distancia_metros: number;
  puntos: Array<{ latitud: number; longitud: number }>;
}
