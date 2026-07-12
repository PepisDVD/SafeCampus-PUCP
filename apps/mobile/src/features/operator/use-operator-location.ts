import {
  Accuracy,
  getCurrentPositionAsync,
  getLastKnownPositionAsync,
  hasServicesEnabledAsync,
  watchPositionAsync,
  type LocationObject,
  type LocationSubscription,
} from "expo-location";
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

const FIRST_FIX_TIMEOUT_MS = 8000;

function toOperatorCoords(position: LocationObject): OperatorCoords {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(null))
      .finally(() => clearTimeout(timer));
  });
}

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

  const stopWatching = useCallback(() => {
    subscription.current?.remove();
    subscription.current = null;
  }, []);

  useEffect(() => {
    if (!isReady) return;

    stopWatching();

    if (permission !== "granted") {
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const servicesEnabled = await hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (active) {
            setError("Activa la ubicacion del dispositivo para usar tu posicion en el mapa.");
            setLoading(false);
          }
          return;
        }

        const lastKnown = await getLastKnownPositionAsync({
          maxAge: 60_000,
          requiredAccuracy: 250,
        }).catch((error) => {
          logger.error("operator-location/last-known", error);
          return null;
        });
        if (active && lastKnown) {
          setCoords(toOperatorCoords(lastKnown));
          setLoading(false);
        }

        const firstFix = await withTimeout(
          getCurrentPositionAsync({ accuracy: Accuracy.Balanced }),
          FIRST_FIX_TIMEOUT_MS,
        );
        if (active && firstFix) {
          setCoords(toOperatorCoords(firstFix));
          setLoading(false);
        } else if (active && !lastKnown) {
          setError("No pudimos obtener tu ubicacion aun. Se mostrara el campus mientras el GPS responde.");
          setLoading(false);
        }

        if (!active) return;
        subscription.current = await watchPositionAsync(
          {
            accuracy: Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 5000,
          },
          (position) => {
            if (!active) return;
            setError(null);
            setCoords(toOperatorCoords(position));
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
      stopWatching();
    };
  }, [isReady, permission, stopWatching]);

  const requestAndLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    const next = await request();
    if (next !== "granted") {
      setError(null);
      setLoading(false);
    }
    return next;
  }, [request]);

  return { coords, permission, loading, error, request: requestAndLoad, openSettings };
}
