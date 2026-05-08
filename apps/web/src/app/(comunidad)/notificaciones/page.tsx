/**
 * Centro de notificaciones interno para la PWA Comunidad.
 */

import { listarNotificaciones } from "@/features/notificaciones/service";
import { NotificacionesClient } from "@/features/notificaciones/components/notificaciones-client";

export default async function ComunidadNotificacionesPage() {
  const data = await listarNotificaciones(50).catch(() => ({
    items: [],
    total: 0,
    unread_count: 0,
  }));

  return (
    <div className="px-4 py-5">
      <NotificacionesClient
        items={data.items}
        unreadCount={data.unread_count}
        incidentBaseHref="/mis-casos"
      />
    </div>
  );
}
