"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@safecampus/ui-kit";
import type { EvolucionPunto, KpisPeriod } from "@safecampus/shared-types";

import { api } from "@/lib/api/client";

type PeriodTab = {
  label: string;
  period: KpisPeriod;
};

const TABS: PeriodTab[] = [
  { label: "Día", period: "semana" },
  { label: "Semana", period: "mes" },
  { label: "Año", period: "año" },
];

type ChartPoint = {
  label: string;
  total: number;
  resueltos: number;
  criticos: number;
};

function formatLabel(fecha: string, period: KpisPeriod): string {
  const date = new Date(fecha + "T00:00:00");
  if (period === "semana") {
    return date.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" });
  }
  if (period === "mes") {
    return date.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  }
  return date.toLocaleDateString("es-PE", { month: "short" });
}

function aggregateByMonth(puntos: EvolucionPunto[]): ChartPoint[] {
  const byMonth: Record<string, ChartPoint> = {};
  for (const p of puntos) {
    const key = p.fecha.slice(0, 7); // YYYY-MM
    if (!byMonth[key]) {
      const date = new Date(p.fecha + "T00:00:00");
      byMonth[key] = {
        label: date.toLocaleDateString("es-PE", { month: "short", year: "2-digit" }),
        total: 0,
        resueltos: 0,
        criticos: 0,
      };
    }
    byMonth[key].total += p.total;
    byMonth[key].resueltos += p.resueltos;
    byMonth[key].criticos += p.criticos;
  }
  return Object.values(byMonth);
}

function toChartPoints(puntos: EvolucionPunto[], period: KpisPeriod): ChartPoint[] {
  if (period === "año") return aggregateByMonth(puntos);
  return puntos.map((p) => ({
    label: formatLabel(p.fecha, period),
    total: p.total,
    resueltos: p.resueltos,
    criticos: p.criticos,
  }));
}

export function IncidentesLineChart() {
  const [activeTab, setActiveTab] = useState<PeriodTab>(TABS[0]!);
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ evolucion: EvolucionPunto[] }>("/incidentes/kpis", {
          params: { period: activeTab.period },
        });
        if (isMounted) setData(toChartPoints(res.evolucion, activeTab.period));
      } catch {
        if (isMounted) setData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Incidentes por {activeTab.label}</CardTitle>
            <CardDescription>
              Total, resueltos y críticos en el periodo seleccionado.
            </CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.period}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab.period === tab.period
                    ? "bg-white text-[#001C55] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#001C55] border-t-transparent" />
          </div>
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Sin datos para este periodo.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#001C55"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="resueltos"
                  name="Resueltos"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="criticos"
                  name="Críticos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded bg-[#001C55]" /> Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded bg-emerald-500" /> Resueltos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded bg-red-500" /> Críticos
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
