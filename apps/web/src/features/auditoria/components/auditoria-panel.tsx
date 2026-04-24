/**
 * 📁 apps/web/src/features/auditoria/components/auditoria-panel.tsx
 * 🎯 Panel del log de auditoría (UC-GU-07): filtros + timeline.
 *    Consume el store compartido donde las demás features escriben eventos.
 * 📦 Feature: Auditoría
 */

"use client";

import { useMemo, useState } from "react";

import { Button } from "@safecampus/ui-kit";

import { useAdminPanel } from "@/features/admin-panel";

import type { AuditoriaFilters as FiltersType } from "../types";

import { AuditoriaFiltersBar } from "./auditoria-filters";
import { AuditoriaList } from "./auditoria-list";
import { filtrarEventosAuditoria } from "../filter";
import { downloadAuditoriaCsv, downloadAuditoriaExcel } from "../export";

const FILTROS_INICIALES: FiltersType = {
  busqueda: "",
  tipo: "todos",
  desde: null,
  hasta: null,
};

export function AuditoriaPanel() {
  const { auditoria } = useAdminPanel();
  const [filtros, setFiltros] = useState<FiltersType>(FILTROS_INICIALES);

  const eventosFiltrados = useMemo(() => {
    return filtrarEventosAuditoria(auditoria, filtros);
  }, [auditoria, filtros]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <AuditoriaFiltersBar filtros={filtros} onChange={setFiltros} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {eventosFiltrados.length} evento{eventosFiltrados.length === 1 ? "" : "s"}
          {" "}de {auditoria.length} totales
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadAuditoriaCsv(eventosFiltrados)}
          >
            Exportar CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadAuditoriaExcel(eventosFiltrados)}
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      <AuditoriaList eventos={eventosFiltrados} />
    </div>
  );
}
