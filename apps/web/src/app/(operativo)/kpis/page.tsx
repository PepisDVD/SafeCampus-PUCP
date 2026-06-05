/**
 * 📁 apps/web/src/app/(operativo)/kpis/page.tsx
 * 🎯 Panel de indicadores operativos: 6 KPIs, evolución, tipos, zonas y SLA.
 * 📦 Módulo: Operativo / KPIs
 *
 * Server Component: lee el periodo de la URL y pide los KPIs al backend
 * (FastAPI → sc_incidentes). No accede a la BD directamente.
 */

import type { KpisPeriod, KpisResponse } from "@safecampus/shared-types";

import { obtenerKpis } from "@/features/incidentes/service";

import { EvolucionChart } from "./_components/evolucion-chart";
import { ExportReporte } from "./_components/export-reporte";
import { KpiCard } from "./_components/kpi-card";
import { PeriodToggle } from "./_components/period-toggle";
import { SlaBars } from "./_components/sla-bars";
import { TiposDonut } from "./_components/tipos-donut";
import { ZonasBar } from "./_components/zonas-bar";

const VALID_PERIODS = new Set<string>(["semana", "mes", "trimestre", "año"]);

const PERIOD_HINT: Record<KpisPeriod, string> = {
  semana: "(SEMANA)",
  mes: "(MES)",
  trimestre: "(TRIMESTRE)",
  año: "(AÑO)",
};

const KPIS_VACIO: KpisResponse = {
  period: "mes",
  frt: { valor: 0, cambio_pct: 0, unidad: "min" },
  tmr: { valor: 0, cambio_pct: 0, unidad: "min" },
  total_incidentes: { valor: 0, cambio_pct: 0, unidad: "" },
  tasa_resolucion: { valor: 0, cambio_pct: 0, unidad: "%" },
  criticos: { valor: 0, cambio_pct: 0, unidad: "" },
  sla_cumplimiento: { valor: 0, cambio_pct: 0, unidad: "%" },
  evolucion: [],
  por_tipo: [],
  por_zona: [],
  sla: {
    frt: { actual: 0, objetivo: 5, unidad: "min" },
    tmr: { actual: 0, objetivo: 60, unidad: "min" },
    escalamiento: { actual: 0, objetivo: 15, unidad: "%" },
    criticos_sla: { actual: 0, objetivo: 90, unidad: "%" },
  },
};

function pickOne(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function KpisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const rawPeriod = pickOne(params.period);
  const period: KpisPeriod =
    rawPeriod && VALID_PERIODS.has(rawPeriod) ? (rawPeriod as KpisPeriod) : "mes";

  const kpis = await obtenerKpis(period).catch(() => KPIS_VACIO);

  return (
    <div className="w-full min-w-0 space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KPIs y Reportes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores operativos de seguridad del campus
          </p>
        </div>
        <PeriodToggle current={period} />
      </div>

      {/* 6 KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="FRT promedio" data={kpis.frt} inverso />
        <KpiCard title="TMR promedio" data={kpis.tmr} inverso />
        <KpiCard
          title={`Total incidentes ${PERIOD_HINT[period]}`}
          data={kpis.total_incidentes}
        />
        <KpiCard title="Tasa de resolución" data={kpis.tasa_resolucion} />
        <KpiCard title="Incidentes críticos" data={kpis.criticos} inverso />
        <KpiCard title="SLA cumplimiento" data={kpis.sla_cumplimiento} />
      </section>

      {/* Evolución */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Evolución de incidentes
        </h2>
        <EvolucionChart data={kpis.evolucion} />
      </section>

      {/* Tipos */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Incidentes por tipo
        </h2>
        <TiposDonut data={kpis.por_tipo} />
      </section>

      {/* Zonas */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Incidentes por zona del campus
        </h2>
        <ZonasBar data={kpis.por_zona} />
      </section>

      {/* SLA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-slate-900">
          Indicadores de respuesta (SLA)
        </h2>
        <SlaBars sla={kpis.sla} />
      </section>

      {/* Export */}
      <ExportReporte />
    </div>
  );
}