/**
 * apps/web/src/app/(operativo)/kpis/loading.tsx
 * Skeleton del panel de KPIs — coincide con el layout de page.tsx
 * (header + 6 tarjetas + paneles de gráficos) para evitar layout shift.
 */

import { Skeleton } from "@safecampus/ui-kit";

export default function KpisLoading() {
  return (
    <div
      className="w-full min-w-0 space-y-5 p-4 sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </section>

      {Array.from({ length: 4 }).map((_, i) => (
        <section
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <Skeleton className="mb-4 h-5 w-56" />
          <Skeleton className="h-48 w-full" />
        </section>
      ))}
    </div>
  );
}
