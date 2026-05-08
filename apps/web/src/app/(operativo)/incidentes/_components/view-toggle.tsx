/**
 * 📁 apps/web/src/app/(operativo)/incidentes/_components/view-toggle.tsx
 * 🎯 Toggle Tabla / Kanban — sincroniza el modo de vista con la URL
 *    preservando los filtros activos.
 * 📦 Módulo: Operativo / Incidentes
 */

"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@safecampus/ui-kit";

export type IncidentesView = "tabla" | "kanban";

type Props = {
  current: IncidentesView;
};

const OPTIONS: { value: IncidentesView; label: string }[] = [
  { value: "tabla", label: "Tabla" },
  { value: "kanban", label: "Kanban" },
];

export function ViewToggle({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setView = (view: IncidentesView) => {
    if (view === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (view === "tabla") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setView(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              active
                ? "bg-white font-semibold text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}