import { Skeleton } from "@safecampus/ui-kit";

/**
 * Esqueleto genérico para las pantallas de la comunidad. Se usa como fallback de
 * `loading.tsx` en cada ruta para dar feedback inmediato al navegar entre módulos
 * (la página es un Server Component que espera datos del backend).
 */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-5 px-4 py-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-44" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex gap-3 rounded-xl border bg-white p-2.5 shadow-sm">
            <Skeleton className="h-24 w-24 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
