/**
 * 📁 apps/web/src/app/(operativo)/incidentes/_components/incidentes-kanban.tsx
 * 🎯 Vista Kanban: una columna por estado, ordenadas según el flujo de atención.
 * 📦 Módulo: Operativo / Incidentes
 */

import { EstadoIncidente, type IncidenteListItem } from "@safecampus/shared-types";
import { cn } from "@safecampus/ui-kit";

import { ESTADO_STYLE } from "@/features/incidentes/presentation";

import { IncidenteKanbanCard } from "./incidente-kanban-card";

type Props = {
  items: IncidenteListItem[];
};

const COLUMNAS: EstadoIncidente[] = [
  EstadoIncidente.RECIBIDO,
  EstadoIncidente.EN_EVALUACION,
  EstadoIncidente.EN_ATENCION,
  EstadoIncidente.ESCALADO,
  EstadoIncidente.PENDIENTE_INFO,
  EstadoIncidente.RESUELTO,
  EstadoIncidente.CERRADO,
];

function groupByEstado(
  items: IncidenteListItem[],
): Record<EstadoIncidente, IncidenteListItem[]> {
  const buckets = Object.fromEntries(
    COLUMNAS.map((estado) => [estado, [] as IncidenteListItem[]]),
  ) as Record<EstadoIncidente, IncidenteListItem[]>;

  for (const item of items) {
    if (buckets[item.estado]) {
      buckets[item.estado].push(item);
    }
  }
  return buckets;
}

export function IncidentesKanban({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-slate-500">
          No se encontraron incidentes con los filtros actuales.
        </p>
      </div>
    );
  }

  const buckets = groupByEstado(items);

  return (
    <div className="w-full pb-2">
      <div className="flex w-full gap-3">
        {COLUMNAS.map((estado) => {
          const cards = buckets[estado];
          const style = ESTADO_STYLE[estado];
          return (
            <div
              key={estado}
              className="flex min-w-0 flex-1 basis-0 flex-col gap-3 rounded-2xl bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    style.className,
                  )}
                >
                  {style.label}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {cards.length}
                </span>
              </div>

              {cards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                  Sin casos
                </div>
              ) : (
                <div className="space-y-3">
                  {cards.map((item) => (
                    <IncidenteKanbanCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}