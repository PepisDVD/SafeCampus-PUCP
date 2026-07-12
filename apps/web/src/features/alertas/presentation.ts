import {
  CanalNotificacion,
  EstadoAlertaCampus,
  EstadoNotificacion,
  NivelSeveridad,
  TipoSegmentoAlerta,
} from "@safecampus/shared-types";
import { formatLimaDateTime } from "@/lib/lima-date";

export const ALERTA_ESTADO_STYLE: Record<EstadoAlertaCampus, { label: string; className: string }> = {
  [EstadoAlertaCampus.BORRADOR]: { label: "Borrador", className: "bg-slate-100 text-slate-700" },
  [EstadoAlertaCampus.PENDIENTE_APROBACION]: { label: "Pendiente aprobacion", className: "bg-indigo-100 text-indigo-700" },
  [EstadoAlertaCampus.PROGRAMADA]: { label: "Programada", className: "bg-blue-100 text-blue-700" },
  [EstadoAlertaCampus.ACTIVA]: { label: "Activa", className: "bg-amber-100 text-amber-800" },
  [EstadoAlertaCampus.EN_ATENCION]: { label: "En atencion", className: "bg-orange-100 text-orange-800" },
  [EstadoAlertaCampus.ATENDIDA]: { label: "Atendida", className: "bg-emerald-100 text-emerald-700" },
  [EstadoAlertaCampus.EXPIRADA]: { label: "Expirada", className: "bg-zinc-100 text-zinc-700" },
  [EstadoAlertaCampus.ENVIADA]: { label: "Enviada", className: "bg-emerald-100 text-emerald-700" },
  [EstadoAlertaCampus.FINALIZADA]: { label: "Finalizada", className: "bg-slate-200 text-slate-700" },
  [EstadoAlertaCampus.CANCELADA]: { label: "Cancelada", className: "bg-red-100 text-red-700" },
};

export const ALERTA_SEVERIDAD_LABEL: Record<NivelSeveridad, string> = {
  [NivelSeveridad.BAJO]: "Bajo",
  [NivelSeveridad.MEDIO]: "Medio",
  [NivelSeveridad.ALTO]: "Alto",
  [NivelSeveridad.CRITICO]: "Critico",
};

export const ALERTA_SEVERIDAD_DOT: Record<NivelSeveridad, string> = {
  [NivelSeveridad.BAJO]: "bg-emerald-500",
  [NivelSeveridad.MEDIO]: "bg-amber-400",
  [NivelSeveridad.ALTO]: "bg-orange-500",
  [NivelSeveridad.CRITICO]: "bg-red-500",
};

export const CANAL_NOTIFICACION_LABEL: Record<CanalNotificacion, string> = {
  [CanalNotificacion.INAPP]: "In-app",
  [CanalNotificacion.WHATSAPP]: "WhatsApp",
  [CanalNotificacion.EMAIL]: "Email",
  [CanalNotificacion.PUSH]: "Push",
  [CanalNotificacion.SMS]: "SMS",
};

export const SEGMENTO_ALERTA_LABEL: Record<TipoSegmentoAlerta, string> = {
  [TipoSegmentoAlerta.ROL]: "Rol",
  [TipoSegmentoAlerta.DEPARTAMENTO]: "Departamento",
  [TipoSegmentoAlerta.USUARIO]: "Usuario",
  [TipoSegmentoAlerta.ZONA]: "Zona",
};

export const ENTREGA_ESTADO_STYLE: Record<EstadoNotificacion, { label: string; className: string }> = {
  [EstadoNotificacion.PENDIENTE]: { label: "Pendiente", className: "bg-slate-100 text-slate-700" },
  [EstadoNotificacion.ENVIADA]: { label: "Enviada", className: "bg-emerald-100 text-emerald-700" },
  [EstadoNotificacion.FALLIDA]: { label: "Fallida", className: "bg-red-100 text-red-700" },
  [EstadoNotificacion.DESCARTADA]: { label: "Descartada", className: "bg-zinc-100 text-zinc-700" },
};

export function formatDateTime(value: string | null): string {
  return formatLimaDateTime(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }, "-");
}
