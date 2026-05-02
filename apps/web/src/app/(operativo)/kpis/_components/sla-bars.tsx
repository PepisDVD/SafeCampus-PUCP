/**
 * 📁 apps/web/src/app/(operativo)/kpis/_components/sla-bars.tsx
 * 🎯 Indicadores de SLA — barras de progreso vs objetivo, color según cumplimiento.
 * 📦 Módulo: Operativo / KPIs
 */

import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import type { SlaIndicador } from "@safecampus/shared-types";
import { cn } from "@safecampus/ui-kit";

type SlaProps = {
  sla: {
    frt: SlaIndicador;
    tmr: SlaIndicador;
    escalamiento: SlaIndicador;
    criticos_sla: SlaIndicador;
  };
};

type RowSpec = {
  key: keyof SlaProps["sla"];
  label: string;
  icon: typeof Clock;
  /** Para FRT/TMR/Escalamiento, menor es mejor; para criticos_sla, mayor es mejor. */
  inverso: boolean;
};

const ROWS: RowSpec[] = [
  { key: "frt", label: "FRT - Tiempo de Primera Respuesta", icon: Clock, inverso: true },
  {
    key: "tmr",
    label: "TMR - Tiempo Medio de Resolución",
    icon: CheckCircle2,
    inverso: true,
  },
  { key: "escalamiento", label: "Tasa de Escalamiento", icon: AlertTriangle, inverso: true },
  {
    key: "criticos_sla",
    label: "SLA de Críticos (< 2 min respuesta)",
    icon: ShieldAlert,
    inverso: false,
  },
];

function getStatus(actual: number, objetivo: number, inverso: boolean) {
  // Devuelve color y porcentaje de barra (0-100).
  if (objetivo === 0) {
    return { color: "bg-slate-300", text: "text-slate-500", pct: 0 };
  }
  let cumplimiento: number; // 0-100, donde 100 = OK
  if (inverso) {
    // menor es mejor: si actual <= objetivo => 100%
    cumplimiento = actual <= objetivo ? 100 : (objetivo / actual) * 100;
  } else {
    cumplimiento = (actual / objetivo) * 100;
  }
  cumplimiento = Math.max(0, Math.min(100, cumplimiento));

  let color: string;
  let text: string;
  if (cumplimiento >= 95) {
    color = "bg-emerald-500";
    text = "text-emerald-600";
  } else if (cumplimiento >= 75) {
    color = "bg-amber-400";
    text = "text-amber-600";
  } else {
    color = "bg-red-500";
    text = "text-red-600";
  }
  return { color, text, pct: cumplimiento };
}

export function SlaBars({ sla }: SlaProps) {
  return (
    <ul className="space-y-5">
      {ROWS.map(({ key, label, icon: Icon, inverso }) => {
        const ind = sla[key];
        const { color, text, pct } = getStatus(ind.actual, ind.objetivo, inverso);
        return (
          <li key={key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", text)} />
                <span className="text-sm text-slate-700">{label}</span>
              </div>
              <div className={cn("text-sm font-bold", text)}>
                {ind.actual}
                {ind.unidad}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  / {ind.objetivo}
                  {ind.unidad}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full", color)}
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}