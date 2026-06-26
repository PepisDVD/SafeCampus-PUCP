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
        (geoError) => {
          const message =
            geoError.code === geoError.PERMISSION_DENIED
              ? "No se otorgo permiso para usar la ubicacion."
              : "No se pudo obtener tu ubicacion.";
          setError(message);
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
        (geoError) => {
          const message =
            geoError.code === geoError.PERMISSION_DENIED
              ? "No se otorgo permiso para usar la ubicacion."
              : "No se pudo mantener tu ubicacion en vivo.";
          setError(message);
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
