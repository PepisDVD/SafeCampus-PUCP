/**
 * apps/web/src/app/(operativo)/alertas/loading.tsx
 * Skeleton de la consola de Alertas — header + barra de filtros + lista,
 * para evitar el salto visual respecto al skeleton genérico del grupo.
 */

import { Skeleton } from "@safecampus/ui-kit";

export default function AlertasLoading() {
  return (
    <div
      className="w-full min-w-0 space-y-5 p-4 sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
