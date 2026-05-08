/**
 * 📁 apps/web/src/app/(operativo)/kpis/_components/kpi-card.tsx
 * 🎯 Tarjeta KPI con valor, unidad, flecha de tendencia y % vs periodo anterior.
 * 📦 Módulo: Operativo / KPIs
 */

import { TrendingDown, TrendingUp } from "lucide-react";
import type { KpiCard as KpiCardData } from "@safecampus/shared-types";
import { cn } from "@safecampus/ui-kit";

type Props = {
  title: string;
  data: KpiCardData;
  /**
   * Si true, una baja del valor es una mejora (verde).
   * Si false, una subida es una mejora (verde).
   * Default: false (más alto = mejor).
   */
  inverso?: boolean;
};

function formatValor(valor: number, unidad: string): string {
  if (unidad === "min") return `${valor} min`;
  if (unidad === "%") return `${valor}%`;
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

export function KpiCard({ title, data, inverso = false }: Props) {
  const cambio = data.cambio_pct;
  const sin_cambio = cambio === 0;
  const subiendo = cambio > 0;

  // ¿La tendencia es positiva (mejora)?
  const positivo = sin_cambio
    ? null
    : inverso
      ? !subiendo // baja del valor = mejora
      : subiendo; // sube el valor = mejora

  const trendColor = sin_cambio
    ? "text-slate-400"
    : positivo
      ? "text-emerald-600"
      : "text-red-500";

  const TrendIcon = subiendo ? TrendingUp : TrendingDown;
  const signo = cambio > 0 ? "+" : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-xs font-bold tracking-wide uppercase",
            "text-emerald-600",
          )}
        >
          {title}
        </p>
        {!sin_cambio && <TrendIcon className={cn("h-4 w-4", trendColor)} />}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {formatValor(data.valor, data.unidad)}
      </p>
      <p className={cn("mt-2 text-xs font-medium", trendColor)}>
        {sin_cambio
          ? "Sin cambio vs período anterior"
          : `${signo}${cambio}% vs período anterior`}
      </p>
    </div>
  );
}