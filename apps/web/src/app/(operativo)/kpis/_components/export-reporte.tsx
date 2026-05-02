/**
 * 📁 apps/web/src/app/(operativo)/kpis/_components/export-reporte.tsx
 * 🎯 Sección de exportación de reportes (CSV / PDF).
 *    Placeholder visual — backend export aún no implementado.
 * 📦 Módulo: Operativo / KPIs
 */

"use client";

import { useState } from "react";
import { Calendar, Download } from "lucide-react";
import { Button, Input, Label } from "@safecampus/ui-kit";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoMinusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ExportReporte() {
  const [desde, setDesde] = useState(isoMinusDays(50));
  const [hasta, setHasta] = useState(todayISO());
  const [severidad, setSeveridad] = useState("");
  const [zona, setZona] = useState("");

  const proximamente = () => {
    alert("Exportación de reportes — próximamente.");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          Exportar reporte
        </h2>
        <Calendar className="h-4 w-4 text-slate-400" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="desde" className="text-xs tracking-wide text-slate-500 uppercase">
            Desde
          </Label>
          <Input
            id="desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hasta" className="text-xs tracking-wide text-slate-500 uppercase">
            Hasta
          </Label>
          <Input
            id="hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="severidad" className="text-xs tracking-wide text-slate-500 uppercase">
            Severidad
          </Label>
          <select
            id="severidad"
            className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm"
            value={severidad}
            onChange={(e) => setSeveridad(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="BAJO">Bajo</option>
            <option value="MEDIO">Medio</option>
            <option value="ALTO">Alto</option>
            <option value="CRITICO">Crítico</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zona" className="text-xs tracking-wide text-slate-500 uppercase">
            Zona
          </Label>
          <select
            id="zona"
            className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
          >
            <option value="">Todas</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={proximamente}
          className="gap-2 bg-[#001C55] text-white hover:bg-[#032E84]"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
        <Button
          type="button"
          onClick={proximamente}
          className="gap-2 bg-red-600 text-white hover:bg-red-700"
        >
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}