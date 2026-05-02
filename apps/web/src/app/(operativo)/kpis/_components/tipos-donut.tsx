/**
 * 📁 apps/web/src/app/(operativo)/kpis/_components/tipos-donut.tsx
 * 🎯 Donut chart con la distribución de incidentes por categoría + leyenda.
 * 📦 Módulo: Operativo / KPIs
 */

"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TipoCount } from "@safecampus/shared-types";

import { formatCategoria } from "@/features/incidentes/presentation";

type Props = {
  data: TipoCount[];
};

const PALETTE = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#a855f7", // purple
  "#3b82f6", // blue
  "#f97316", // orange
  "#dc2626", // dark red
  "#64748b", // slate
];

export function TiposDonut({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        Sin datos en el periodo
      </div>
    );
  }

  const items = data.map((d, i) => ({
    ...d,
    label: formatCategoria(d.tipo),
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_1fr]">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="total"
              nameKey="label"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
              formatter={(value) => [`${String(value)} casos`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li
            key={it.tipo}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: it.fill }}
              />
              <span className="text-slate-700">{it.label}</span>
            </span>
            <span className="flex items-center gap-3 text-slate-500">
              <span className="font-semibold text-slate-900">{it.total}</span>
              <span className="w-10 text-right text-xs">{it.porcentaje}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}