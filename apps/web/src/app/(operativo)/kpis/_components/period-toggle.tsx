/**
 * 📁 apps/web/src/app/(operativo)/kpis/_components/period-toggle.tsx
 * 🎯 Toggle Semana / Mes / Trimestre — sincroniza con la URL.
 * 📦 Módulo: Operativo / KPIs
 */

"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@safecampus/ui-kit";
import type { KpisPeriod } from "@safecampus/shared-types";

const OPTIONS: { value: KpisPeriod; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "trimestre", label: "Trimestre" },
];

type Props = {
  current: KpisPeriod;
};

export function PeriodToggle({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setPeriod = (period: KpisPeriod) => {
    if (period === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (period === "mes") params.delete("period");
    else params.set("period", period);
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="inline-flex gap-2 rounded-full bg-slate-100 p-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              active
                ? "bg-[#001C55] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}