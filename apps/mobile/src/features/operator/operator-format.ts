import type { IncidentSeverity, IncidentStatus } from "../../shared/types/api";

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
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function severityTone(severity?: IncidentSeverity | null) {
  if (severity === "CRITICO") return "danger";
  if (severity === "ALTO") return "warning";
  if (severity === "MEDIO") return "info";
  return "success";
}
