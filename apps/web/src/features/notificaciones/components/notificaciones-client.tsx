"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import type { NotificacionItem } from "@safecampus/shared-types";
import { Button, Card, cn } from "@safecampus/ui-kit";

import {
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "@/features/notificaciones/client";

type NotificacionesClientProps = {
  items: NotificacionItem[];
  unreadCount: number;
  incidentBaseHref: string;
};

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PE", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function NotificacionesClient({
  items,
  unreadCount,
  incidentBaseHref,
}: NotificacionesClientProps) {
  const router = useRouter();

  const onRead = async (id: string) => {
    await marcarNotificacionLeida(id);
    router.refresh();
  };

  const onReadAll = async () => {
    await marcarTodasNotificacionesLeidas();
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount} sin leer
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReadAll}
          disabled={unreadCount === 0}
          className="gap-2"
        >
          <CheckCheck className="h-4 w-4" />
          Leer todas
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-6 text-center">
          <Bell className="mx-auto mb-2 h-7 w-7 text-slate-300" />
          <p className="text-sm text-slate-500">
            No tienes notificaciones por ahora.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const unread = !item.fecha_lectura;
            return (
              <Card
                key={item.id}
                className={cn(
                  "border p-4",
                  unread
                    ? "border-[#001C55]/20 bg-[#001C55]/5"
                    : "border-slate-200 bg-white",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                      unread ? "bg-[#001C55]" : "bg-slate-300",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.asunto ?? "Actualizacion de incidente"}
                      </p>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatFecha(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {item.contenido}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {unread && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRead(item.id)}
                        >
                          Marcar leida
                        </Button>
                      )}
                      {item.incidente_id && (
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2 bg-[#001C55] hover:bg-[#032E84]"
                          onClick={() => {
                            router.push(`${incidentBaseHref}/${item.incidente_id}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver incidente
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
