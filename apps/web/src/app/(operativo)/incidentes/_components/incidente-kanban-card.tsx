/**
 * 📁 apps/web/src/app/(operativo)/incidentes/_components/incidente-kanban-card.tsx
 * 🎯 Tarjeta vertical de incidente para la vista Kanban.
 *    Reusa los helpers de presentación compartidos con la tabla.
 * 📦 Módulo: Operativo / Incidentes
 */

import Link from "next/link";
import { Clock, MapPin, User } from "lucide-react";
import type { IncidenteListItem } from "@safecampus/shared-types";
import { cn } from "@safecampus/ui-kit";

import { SEVERIDAD_COLOR } from "@/features/incidentes/presentation";

type Props = {
  item: IncidenteListItem;
};

function formatHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function firstName(nombre: string | null): string | null {
  if (!nombre) return null;
  return nombre.trim().split(/\s+/)[0] || null;
}

export function IncidenteKanbanCard({ item }: Props) {
  const severidadColor = item.severidad
    ? SEVERIDAD_COLOR[item.severidad]
    : "bg-slate-300";
  const operadorFirstName = firstName(item.operador_nombre);

  return (
    <Link
      href={`/incidentes/${item.id}`}
      className="relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      <span
        aria-hidden
        className={cn("absolute top-0 bottom-0 left-0 w-1", severidadColor)}
      />

      <div className="flex items-start justify-between gap-2 pl-2">
        <p className="font-mono text-xs font-bold text-slate-500">
          {item.codigo}
        </p>
        {item.severidad && (
          <span
            aria-hidden
            className={cn("h-2 w-2 shrink-0 rounded-full", severidadColor)}
          />
        )}
      </div>

      <p className="mt-1.5 pl-2 text-sm font-bold text-slate-900">
        {item.titulo}
      </p>

      <div className="mt-3 space-y-1 pl-2 text-xs text-slate-500">
        {item.lugar_referencia && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.lugar_referencia}</span>
          </div>
        )}
        {operadorFirstName && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{operadorFirstName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{formatHora(item.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}