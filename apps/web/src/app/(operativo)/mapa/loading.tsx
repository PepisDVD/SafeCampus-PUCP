/**
 * apps/web/src/app/(operativo)/mapa/loading.tsx
 * Skeleton del mapa táctico — bloque grande a pantalla casi completa,
 * coincide con el layout de page.tsx para evitar el salto visual.
 */

import { Skeleton } from "@safecampus/ui-kit";

export default function MapaLoading() {
  return (
    <div className="p-6" aria-busy="true" aria-live="polite">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-xl" />
    </div>
  );
}
