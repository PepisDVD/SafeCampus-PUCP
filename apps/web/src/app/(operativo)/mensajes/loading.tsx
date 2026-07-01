/**
 * apps/web/src/app/(operativo)/mensajes/loading.tsx
 * Skeleton de la consola del ChatBot — layout de bandeja (lista de
 * conversaciones + panel de chat) para una transición sin saltos.
 */

import { Skeleton } from "@safecampus/ui-kit";

export default function MensajesLoading() {
  return (
    <div
      className="grid h-[calc(100vh-3.5rem)] grid-cols-1 gap-0 md:grid-cols-[340px_minmax(0,1fr)]"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Lista de conversaciones */}
      <div className="space-y-3 border-r border-slate-200 p-4">
        <Skeleton className="h-9 w-full rounded-lg" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Panel de chat */}
      <div className="hidden flex-col p-6 md:flex">
        <Skeleton className="h-6 w-48" />
        <div className="mt-6 flex-1 space-y-4">
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
          <Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" />
          <Skeleton className="h-12 w-1/2 rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
