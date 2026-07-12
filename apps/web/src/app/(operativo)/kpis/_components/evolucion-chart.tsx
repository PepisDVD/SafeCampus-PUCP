/**
 * 📁 apps/web/src/app/(operativo)/kpis/_components/evolucion-chart.tsx
 * 🎯 Line chart con la evolución diaria de Total / Resueltos / Críticos.
 * 📦 Módulo: Operativo / KPIs
 */

"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvolucionPunto } from "@safecampus/shared-types";

type Props = {
  data: EvolucionPunto[];
};

const FORMATTER = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatLabel(iso: string): string {
  try {
    return FORMATTER.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
  } catch {
    return iso;
  }
}

export function EvolucionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        Sin datos en el periodo
      </div>
    );
  }

  const formatted = data.map((d) => ({ ...d, label: formatLabel(d.fecha) }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#001C55"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="resueltos"
            name="Resueltos"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="criticos"
            name="Críticos"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Leyenda manual (estilo similar a la mock) */}
      <div className="mt-2 flex items-center justify-end gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded bg-[#001C55]" /> Total
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded bg-emerald-500" /> Resueltos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded bg-red-500" /> Críticos
        </span>
      </div>
    </div>
  );
}
