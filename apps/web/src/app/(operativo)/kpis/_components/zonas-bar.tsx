/**
 * 📁 apps/web/src/app/(operativo)/kpis/_components/zonas-bar.tsx
 * 🎯 Bar chart horizontal con incidentes por zona del campus.
 * 📦 Módulo: Operativo / KPIs
 */

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ZonaCount } from "@safecampus/shared-types";

type Props = {
  data: ZonaCount[];
};

export function ZonasBar({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Sin datos en el periodo
      </div>
    );
  }

  const max = data.reduce((m, z) => (z.total > m ? z.total : m), 0);
  const items = data.map((entry) => ({
    ...entry,
    fill: entry.total === max ? "#dc2626" : "#001C55",
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={items}
          margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="zona"
            type="category"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(value) => [`${String(value)} casos`, ""]}
          />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}