import type { AuditoriaFilters, EventoAuditoria } from "./types";

export function filtrarEventosAuditoria(
  auditoria: EventoAuditoria[],
  filtros: AuditoriaFilters,
): EventoAuditoria[] {
  const term = filtros.busqueda.trim().toLowerCase();

  return auditoria.filter((ev) => {
    if (filtros.tipo !== "todos" && ev.tipo !== filtros.tipo) return false;

    if (term) {
      const blob = `${ev.actor} ${ev.accion} ${ev.detalle}`.toLowerCase();
      if (!blob.includes(term)) return false;
    }

    if (filtros.desde) {
      const soloFecha = ev.timestamp.slice(0, 10);
      if (soloFecha < filtros.desde) return false;
    }

    if (filtros.hasta) {
      const soloFecha = ev.timestamp.slice(0, 10);
      if (soloFecha > filtros.hasta) return false;
    }

    return true;
  });
}
