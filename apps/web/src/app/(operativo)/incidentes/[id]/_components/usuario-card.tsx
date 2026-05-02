/**
 * 📁 apps/web/src/app/(operativo)/incidentes/[id]/_components/usuario-card.tsx
 * 🎯 Tarjeta compacta de usuario (reportante / operador / supervisor) en el detalle.
 * 📦 Módulo: Operativo / Incidentes / Detalle
 */

import type { UsuarioMini } from "@safecampus/shared-types";

import { getInitials } from "@/features/incidentes/presentation";

type Props = {
  label: string;
  usuario: UsuarioMini | null;
  emptyText?: string;
};

export function UsuarioCard({ label, usuario, emptyText = "Sin asignar" }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      {usuario ? (
        <div className="mt-3 flex items-center gap-3">
          {usuario.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={usuario.avatar_url}
              alt={usuario.nombre_completo}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#001C55]/10 text-sm font-bold text-[#001C55]">
              {getInitials(usuario.nombre_completo)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {usuario.nombre_completo}
            </p>
            {usuario.email && (
              <p className="truncate text-xs text-slate-500">{usuario.email}</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}