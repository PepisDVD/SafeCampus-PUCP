"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import type { NotificacionItem } from "@safecampus/shared-types";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@safecampus/ui-kit";

import {
  listarNotificacionesClient,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "@/features/notificaciones/client";
import { NotificationBadge } from "@/features/notificaciones/components/notification-badge";
import { formatLimaDateTime } from "@/lib/lima-date";

type NotificationPopoverProps = {
  incidentBaseHref: string;
};

function formatFecha(iso: string): string {
  return formatLimaDateTime(iso, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }, iso);
}

export function NotificationPopover({
  incidentBaseHref,
}: NotificationPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const response = await listarNotificacionesClient(10);
      setItems(response.items);
      setUnreadCount(response.unread_count);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const readOne = async (id: string) => {
    await marcarNotificacionLeida(id);
    await load();
    router.refresh();
  };

  const readAll = async () => {
    await marcarTodasNotificacionesLeidas();
    await load();
    router.refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#001C55]"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <NotificationBadge />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Notificaciones
            </p>
            <p className="text-xs text-slate-500">{unreadCount} sin leer</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={readAll}
            disabled={unreadCount === 0 || loading}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Leer
          </Button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-500">
                No tienes notificaciones.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const unread = !item.fecha_lectura;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-lg border p-3",
                      unread
                        ? "border-[#001C55]/20 bg-[#001C55]/5"
                        : "border-slate-100 bg-white",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          unread ? "bg-[#001C55]" : "bg-slate-300",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.asunto ?? "Actualizacion"}
                          </p>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {formatFecha(item.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {item.contenido}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {unread && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => readOne(item.id)}
                            >
                              Marcar leida
                            </Button>
                          )}
                          {item.incidente_id && (
                            <Button
                              type="button"
                              size="sm"
                              className="gap-1.5 bg-[#001C55] hover:bg-[#032E84]"
                              onClick={() => {
                                setOpen(false);
                                router.push(
                                  `${incidentBaseHref}/${item.incidente_id}`,
                                );
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ver caso
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
