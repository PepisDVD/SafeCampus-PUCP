import { EstadoCasoLF, EstadoCustodia, EstadoMatchLF, TipoCasoLF } from "./enums";

export type CategoriaLf = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  activa: boolean;
  es_perecible: boolean;
  metadatos_schema?: Record<string, unknown> | null;
};

export type CasoLfListItem = {
  id: string;
  codigo: string;
  tipo: TipoCasoLF;
  estado: EstadoCasoLF;
  titulo: string;
  descripcion: string;
  categoria_id?: string | null;
  categoria_nombre?: string | null;
  subcategoria?: string | null;
  lugar_referencia?: string | null;
  fecha_evento?: string | null;
  foto_url?: string | null;
  color_principal?: string | null;
  marca?: string | null;
  conteo_comentarios: number;
  ultimo_comentario?: string | null;
  ultimo_comentario_at?: string | null;
  reportante?: UsuarioMiniLf | null;
  created_at: string;
};

export type UsuarioMiniLf = {
  id: string;
  nombre_completo: string;
  email?: string | null;
  avatar_url?: string | null;
  rol?: string | null;
};

export type ComentarioLf = {
  id: string;
  caso_id: string;
  autor?: UsuarioMiniLf | null;
  contenido: string;
  visible: boolean;
  motivo_ocultamiento?: string | null;
  created_at: string;
  updated_at: string;
};

export type CasoLfDetail = CasoLfListItem & {
  reportante?: UsuarioMiniLf | null;
  contacto_info?: string | null;
  foto_adicional_urls: string[];
  etiquetas: string[];
  latitud?: number | null;
  longitud?: number | null;
  updated_at: string;
  historial: Array<{
    id: string;
    estado_anterior?: EstadoCasoLF | null;
    estado_nuevo: EstadoCasoLF;
    accion: string;
    comentario?: string | null;
    ejecutado_por?: UsuarioMiniLf | null;
    created_at: string;
  }>;
  comentarios: ComentarioLf[];
};

export type MatchLf = {
  id: string;
  caso_perdido_id: string;
  caso_encontrado_id: string;
  score_total: number;
  score_detalle: Record<string, number>;
  estado: EstadoMatchLF;
  caso_contraparte?: CasoLfListItem | null;
  created_at: string;
};

export type CustodiaLf = {
  id: string;
  caso_id: string;
  codigo?: string | null;
  titulo?: string | null;
  estado: EstadoCustodia;
  ubicacion_custodia: string;
  observaciones?: string | null;
  es_perecible: boolean;
  fecha_recepcion: string;
  fecha_vencimiento: string;
  reclamante_id?: string | null;
  metodo_verificacion?: string | null;
  created_at: string;
  updated_at: string;
};

export type KpisLf = {
  total_casos: number;
  abiertos: number;
  en_custodia: number;
  cerrados: number;
  tasa_recuperacion: number;
  matches_sugeridos: number;
  matches_confirmados: number;
  custodias_por_vencer: number;
  por_zona: Array<{ zona: string; total: number }>;
};
