import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

import { useNotificationPermission } from "../permissions";
import { logger } from "../../shared/fallback/logger";
import type { IncidentListItem } from "../../shared/types/api";

// Mostrar la notificación aunque la app esté en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Dispara una notificación local cuando aparece un incidente nuevo asignado al
 * operador (lo detecta en el polling del listado, ya filtrado por `mios=true`).
 *
 * `synced` indica que ya hubo al menos una sincronización real con el backend:
 * hasta entonces el listado contiene datos mock/iniciales, así que solo se
 * siembra el baseline sin notificar (evita una avalancha al abrir la app).
 *
 * Nota: usa notificaciones *locales* — funcionan con la app en primer o segundo
 * plano mientras el proceso siga vivo. La push remota (app cerrada) requiere un
 * development build; ver TODO de registro de Expo Push token.
 */
export function useIncidentAssignmentNotifications(
  incidents: IncidentListItem[],
  synced: boolean,
): void {
  const { state, request } = useNotificationPermission();
  const seen = useRef<Set<string> | null>(null);
  const baselineReady = useRef(false);

  // Pedir el permiso una sola vez si aún no se decidió.
  useEffect(() => {
    if (state === "undetermined") void request();
  }, [state, request]);

  useEffect(() => {
    const currentIds = new Set(incidents.map((item) => item.id));

    // Antes del primer sync real: solo seguir el set (cubre el reemplazo de mocks).
    if (!synced) {
      seen.current = currentIds;
      return;
    }

    // Primer lote ya sincronizado: fijar baseline sin notificar.
    if (!baselineReady.current || seen.current === null) {
      seen.current = currentIds;
      baselineReady.current = true;
      return;
    }

    // Sin permiso: mantener el set al día para no notificar en lote al concederlo luego.
    if (state !== "granted") {
      seen.current = currentIds;
      return;
    }

    const nuevos = incidents.filter((item) => !seen.current?.has(item.id));
    for (const incidente of nuevos) {
      void Notifications.scheduleNotificationAsync({
        content: {
          title: "Nuevo incidente asignado",
          body: `${incidente.codigo} · ${incidente.titulo}`,
          data: { incidentId: incidente.id },
        },
        trigger: null,
      }).catch((error) => logger.error("incident-notify/schedule", error));
    }

    seen.current = currentIds;
  }, [incidents, synced, state]);
}
