/**
 * Hook web para geolocalizacion del navegador.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BrowserLocation = {
  latitud: number;
  longitud: number;
  precision_metros: number | null;
};

type GeolocationState = {
  location: BrowserLocation | null;
  loading: boolean;
  error: string | null;
  watching: boolean;
  lastUpdatedAt: number | null;
  requestLocation: () => Promise<BrowserLocation | null>;
  startLiveLocation: () => Promise<BrowserLocation | null>;
  stopLiveLocation: () => void;
  clearLocation: () => void;
};

/**
 * El navegador devuelve PERMISSION_DENIED (codigo 1) tanto si el usuario nego
 * el permiso AL SITIO como si el sistema operativo se lo niega AL NAVEGADOR
 * (iOS: Ajustes > Privacidad > Localizacion > Sitios web de Safari = "Nunca").
 * Son problemas distintos y se arreglan en sitios distintos, asi que
 * consultamos la Permissions API para saber cual de los dos es: si el sitio
 * figura como `granted` y aun asi nos deniegan, el bloqueo es del sistema.
 */
async function describePermissionDenied(): Promise<string> {
  const sitePermission = await navigator.permissions
    ?.query({ name: "geolocation" })
    .catch(() => null);

  if (sitePermission?.state === "granted") {
    return "Tu navegador tiene permiso, pero el sistema esta bloqueando la ubicacion. En iPhone: Ajustes > Privacidad y seguridad > Localizacion > Sitios web de Safari.";
  }

  return "No se otorgo permiso para usar la ubicacion. Habilitalo para este sitio en los ajustes de tu navegador.";
}

function geolocationErrorMessage(
  geoError: GeolocationPositionError,
  fallback: string,
): Promise<string> {
  if (geoError.code === geoError.PERMISSION_DENIED) {
    return describePermissionDenied();
  }
  if (geoError.code === geoError.POSITION_UNAVAILABLE) {
    return Promise.resolve(
      "No hay senal de GPS en este momento. Si estas en un interior, acercate a una ventana o elige la zona del campus.",
    );
  }
  if (geoError.code === geoError.TIMEOUT) {
    return Promise.resolve(
      "El GPS tardo demasiado en responder. Vuelve a intentarlo o elige la zona del campus.",
    );
  }
  return Promise.resolve(fallback);
}

function toBrowserLocation(position: GeolocationPosition): BrowserLocation {
  return {
    latitud: position.coords.latitude,
    longitud: position.coords.longitude,
    precision_metros: Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : null,
  };
}

export function useGeolocation(): GeolocationState {
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const setNextLocation = useCallback((position: GeolocationPosition) => {
    const nextLocation = toBrowserLocation(position);
    setLocation(nextLocation);
    setLastUpdatedAt(Date.now());
    return nextLocation;
  }, []);

  const stopLiveLocation = useCallback(() => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setWatching(false);
    setLoading(false);
  }, []);

  const requestLocation = async () => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite geolocalizacion.");
      return null;
    }

    setLoading(true);
    return new Promise<BrowserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = setNextLocation(position);
          setLoading(false);
          resolve(nextLocation);
        },
        async (geoError) => {
          setError(
            await geolocationErrorMessage(geoError, "No se pudo obtener tu ubicacion."),
          );
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        },
      );
    });
  };

  const startLiveLocation = async () => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite geolocalizacion.");
      return null;
    }

    if (watchIdRef.current !== null) {
      return location;
    }

    setLoading(true);
    setWatching(true);

    return new Promise<BrowserLocation | null>((resolve) => {
      let resolved = false;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const nextLocation = setNextLocation(position);
          setLoading(false);
          if (!resolved) {
            resolved = true;
            resolve(nextLocation);
          }
        },
        async (geoError) => {
          setError(
            await geolocationErrorMessage(
              geoError,
              "No se pudo mantener tu ubicacion en vivo.",
            ),
          );
          stopLiveLocation();
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        },
      );
    });
  };

  useEffect(() => stopLiveLocation, [stopLiveLocation]);

  return {
    location,
    loading,
    error,
    watching,
    lastUpdatedAt,
    requestLocation,
    startLiveLocation,
    stopLiveLocation,
    clearLocation: () => {
      stopLiveLocation();
      setLocation(null);
      setError(null);
      setLastUpdatedAt(null);
    },
  };
}
