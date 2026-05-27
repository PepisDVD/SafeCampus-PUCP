/**
 * 📁 apps/web/src/app/(operativo)/incidentes/_components/incidentes-table.tsx
 * 🎯 Tabla de gestión de incidentes (vista supervisor/operador).
 * 📦 Módulo: Operativo / Incidentes
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { IncidenteListItem } from "@safecampus/shared-types";
import { Badge, cn } from "@safecampus/ui-kit";

import {
  ESTADO_STYLE,
  SEVERIDAD_COLOR,
  SEVERIDAD_LABEL,
  formatCategoria,
  getInitials,
} from "@/features/incidentes/presentation";

type Props = {
  items: IncidenteListItem[];
  footer?: ReactNode;
};

function CategoriaLabel({ categoria }: { categoria: string | null }) {
  if (!categoria) return null;
  return <p className="text-xs text-slate-500">{formatCategoria(categoria)}</p>;
}

export function IncidentesTable({ items, footer }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-slate-500">
          No se encontraron incidentes con los filtros actuales.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Header (solo desktop) */}
      <div className="hidden border-b border-slate-200 bg-slate-50/50 px-6 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase md:grid md:grid-cols-[140px_2fr_1.2fr_120px_140px_180px]">
        <span>ID</span>
        <span>Incidente</span>
        <span>Zona</span>
        <span>Severidad</span>
        <span>Estado</span>
        <span>Asignado a</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const severidadBar = item.severidad
            ? SEVERIDAD_COLOR[item.severidad]
            : "bg-slate-200";
          const estadoStyle = ESTADO_STYLE[item.estado];
          return (
            <li key={item.id} className="relative">
              <Link
                href={`/incidentes/${item.id}`}
                className="grid grid-cols-1 items-center gap-3 px-6 py-4 transition hover:bg-slate-50 md:grid-cols-[140px_2fr_1.2fr_120px_140px_180px]"
              >
                {/* Severity bar */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-2 bottom-2 left-0 w-1 rounded-r-full",
                    severidadBar,
                  )}
                />

                {/* ID */}
                <span className="font-mono text-sm font-bold text-slate-900">
                  {item.codigo}
                </span>

                {/* Incidente */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.titulo}
                  </p>
                  <CategoriaLabel categoria={item.categoria} />
                </div>

                {/* Zona */}
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {item.lugar_referencia ?? "—"}
                  </span>
                </div>

                {/* Severidad */}
                <div className="flex items-center gap-2 text-sm">
                  {item.severidad ? (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          "h-2 w-2 rounded-full",
                          SEVERIDAD_COLOR[item.severidad],
                        )}
                      />
                      <span className="text-slate-700">
                        {SEVERIDAD_LABEL[item.severidad]}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                {/* Estado */}
                <div>
                  <Badge
                    className={cn(
                      "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
                      estadoStyle.className,
                    )}
                  >
                    {estadoStyle.label}
                  </Badge>
                </div>

                {/* Asignado a */}
                <div className="flex items-center gap-2">
                  {item.operador_nombre ? (
                    <>
                      {item.operador_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.operador_avatar_url}
                          alt={item.operador_nombre}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#001C55]/10 text-[10px] font-bold text-[#001C55]">
                          {getInitials(item.operador_nombre)}
                        </span>
                      )}
                      <span className="truncate text-sm text-slate-700">
                        {item.operador_nombre.split(" ")[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400">Sin asignar</span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {footer}
    </div>
  );
}