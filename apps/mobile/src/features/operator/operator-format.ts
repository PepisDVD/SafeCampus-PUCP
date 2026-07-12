import type { IncidentSeverity, IncidentStatus } from "../../shared/types/api";
import { formatLimaDateTime } from "@safecampus/shared-types";

export const statusLabel: Record<IncidentStatus, string> = {
  RECIBIDO: "Recibido",
  EN_EVALUACION: "En evaluacion",
  EN_ATENCION: "En atencion",
  ESCALADO: "Escalado",
  PENDIENTE_INFO: "Pendiente",
  RESUELTO: "Resuelto",
  CERRADO: "Cerrado",
};

export const severityLabel: Record<IncidentSeverity, string> = {
  BAJO: "Bajo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Critico",
};

export function formatTime(value?: string | null) {
  return formatLimaDateTime(value, {
    hour: "2-digit",
    minute: "2-digit",
  }, "--:--");
}

export function severityTone(severity?: IncidentSeverity | null) {
  if (severity === "CRITICO") return "danger";
  if (severity === "ALTO") return "warning";
  if (severity === "MEDIO") return "info";
  return "success";
}
