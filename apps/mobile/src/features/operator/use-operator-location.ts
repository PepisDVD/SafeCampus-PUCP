import { Accuracy, watchPositionAsync, type LocationSubscription } from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocationPermission } from "../permissions";
import type { PermissionState } from "../permissions";
import { logger } from "../../shared/fallback/logger";

export type OperatorCoords = {
  latitude: number;
  longitude: number;
};

export type OperatorLocation = {
  /** Última posición conocida del operador, o `null` si aún no se obtiene. */
  coords: OperatorCoords | null;
  /** Estado del permiso de ubicación (granted/denied/blocked/undetermined). */
  permission: PermissionState;
  /** `true` mientras se resuelve el permiso o la primera lectura del GPS. */
  loading: boolean;
  /** Error recuperable de ubicacion; nunca debe cerrar la app. */
  error: string | null;
  /** Solicita el permiso al usuario (no-op si ya está concedido). */
  request: () => Promise<PermissionState>;
  /** Abre los ajustes del sistema (para el caso `blocked`). */
  openSettings: () => Promise<void>;
};

/**
 * Provee la ubicación real del operador mediante GPS.
 * Se suscribe a actualizaciones mientras el permiso esté concedido y limpia
 * la suscripción al desmontar para no drenar batería en segundo plano.
 */
export function useOperatorLocation(): OperatorLocation {
  const { state: permission, request, openSettings, isReady } = useLocationPermission();
  const [coords, setCoords] = useState<OperatorCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscription = useRef<LocationSubscription | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (permission !== "granted") {
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        subscription.current = await watchPositionAsync(
          { accuracy: Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
          (position) => {
            if (!active) return;
            setError(null);
            setCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLoading(false);
          },
        );
      } catch (error) {
        logger.error("operator-location/watch", error);
        if (active) {
          setError("No se pudo activar la ubicacion en este dispositivo.");
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [isReady, permission]);

  const requestAndLoad = useCallback(async () => {
    const next = await request();
    if (next !== "granted") {
      setError(null);
      setLoading(false);
    }
    return next;
  }, [request]);

  return { coords, permission, loading, error, request: requestAndLoad, openSettings };
}
