"use client";

import Image from "next/image";
import { Badge, Skeleton, cn } from "@safecampus/ui-kit";
import { ChevronRight, ImageOff, MapPin, MessageSquare } from "lucide-react";
import { formatRelativeTime, tipoLabel } from "../presentation";
import type { CasoLfListItem } from "../types";

const tipoTone: Record<string, string> = {
  ENCONTRADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PERDIDO: "border-rose-200 bg-rose-50 text-rose-700",
};

/** Tarjeta tipo lista (imagen a la izquierda, detalle a la derecha). */
export function CaseCard({ item, onOpen }: { item: CasoLfListItem; onOpen: (item: CasoLfListItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full rounded-xl border bg-white p-2.5 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex gap-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {item.foto_url ? (
            <Image src={item.foto_url} alt="" fill unoptimized sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <ImageOff className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.titulo}</p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {item.lugar_referencia && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{item.lugar_referencia}</span>
              </span>
            )}
            <span aria-hidden>·</span>
            <span>{formatRelativeTime(item.created_at)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[11px]", tipoTone[item.tipo] ?? "")}>
              {tipoLabel(item.tipo)}
            </Badge>
            {item.categoria_nombre && (
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-[11px] text-sky-700">
                {item.categoria_nombre}
              </Badge>
            )}
            {item.conteo_comentarios > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <MessageSquare className="h-3 w-3" />
                {item.conteo_comentarios}
              </span>
            )}
          </div>

          <span className="mt-0.5 flex items-center gap-0.5 text-xs font-medium text-[#001C55]">
            Ver hilo <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

export function CaseCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border bg-white p-2.5 shadow-sm">
      <Skeleton className="h-24 w-24 shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

export function CaseListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => <CaseCardSkeleton key={index} />)}
    </div>
  );
}
