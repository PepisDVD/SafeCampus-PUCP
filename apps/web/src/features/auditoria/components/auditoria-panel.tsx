/**
 * 📁 apps/web/src/features/auditoria/components/auditoria-panel.tsx
 * 🎯 Panel del log de auditoría (UC-GU-07): filtros + timeline.
 *    Consume el store compartido donde las demás features escriben eventos.
 * 📦 Feature: Auditoría
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@safecampus/ui-kit";

import { adminApi, type AdminAuditLogApi } from "@/lib/api/admin";

import type { AuditoriaFilters as FiltersType } from "../types";

import { AuditoriaFiltersBar } from "./auditoria-filters";
import { AuditoriaList } from "./auditoria-list";
import { downloadAuditoriaCsv, downloadAuditoriaExcel } from "../export";

const FILTROS_INICIALES: FiltersType = {
  busqueda: "",
  tipo: "todos",
  desde: null,
  hasta: null,
};

export function AuditoriaPanel() {
  const [auditoria, setAuditoria] = useState<AdminAuditLogApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltersType>(FILTROS_INICIALES);

  const hasCustomFilter = useMemo(() => {
    return Boolean(
      filtros.busqueda.trim() || filtros.tipo !== "todos" || filtros.desde || filtros.hasta,
    );
  }, [filtros]);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      void adminApi
        .listAuditLogs({
          search: filtros.busqueda.trim() || undefined,
          event_type: filtros.tipo === "todos" ? undefined : filtros.tipo,
          desde: filtros.desde ? `${filtros.desde}T00:00:00Z` : undefined,
          hasta: filtros.hasta ? `${filtros.hasta}T23:59:59Z` : undefined,
          limit: hasCustomFilter ? 200 : 50,
        })
        .then((response) => {
          if (!mounted) return;
          setAuditoria(response.items);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "No se pudo cargar la auditoría.");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [filtros, hasCustomFilter]);

  const eventosFiltrados = useMemo(() => {
    return auditoria.map((item) => ({
      id: item.id,
      tipo: item.tipo as
        | "usuario_creado"
        | "usuario_editado"
        | "usuario_suspendido"
        | "usuario_reactivado"
        | "rbac_modificado"
        | "integracion_verificada"
        | "integracion_alerta"
        | "otro",
      actor: item.actor,
      accion: item.accion,
      detalle: item.detalle,
      timestamp: new Date(item.timestamp).toLocaleString("es-PE"),
    }));
  }, [auditoria]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <AuditoriaFiltersBar filtros={filtros} onChange={setFiltros} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {eventosFiltrados.length} evento{eventosFiltrados.length === 1 ? "" : "s"}
          {hasCustomFilter ? " (resultado filtrado)" : " (últimos 50 por defecto)"}
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

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-muted-foreground">
          Cargando auditoría...
        </div>
      ) : (
        <AuditoriaList eventos={eventosFiltrados} />
      )}
    </div>
  );
}
