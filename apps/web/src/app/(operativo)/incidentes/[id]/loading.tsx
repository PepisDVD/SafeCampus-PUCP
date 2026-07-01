/**
 * apps/web/src/app/(operativo)/incidentes/[id]/loading.tsx
 * Skeleton de carga del detalle de incidente.
 *
 * Next.js lo muestra de inmediato al navegar mientras el Server Component
 * resuelve los fetch al backend — mejora la latencia percibida.
 */

import { Skeleton } from "@safecampus/ui-kit";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-385 space-y-5 p-4 lg:p-6">
      <Skeleton className="h-5 w-44" />

      {/* Cabecera */}
      <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <span aria-hidden className="absolute top-0 bottom-0 left-0 w-1.5 bg-slate-200" />
        <div className="space-y-3 pl-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-2/3" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_510px]">
        <main className="space-y-5">
          {/* Resumen */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-4 h-5 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </section>

          {/* Historial */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <Skeleton className="h-64 w-full rounded-lg" />
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
