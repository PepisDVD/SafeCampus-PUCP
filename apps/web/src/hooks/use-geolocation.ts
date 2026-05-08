/**
 * Hook web para geolocalizacion del navegador.
 */

"use client";

import { useState } from "react";

export type BrowserLocation = {
  latitud: number;
  longitud: number;
  precision_metros: number | null;
};

type GeolocationState = {
  location: BrowserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<BrowserLocation | null>;
  clearLocation: () => void;
};

export function useGeolocation(): GeolocationState {
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const nextLocation = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision_metros: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
          };
          setLocation(nextLocation);
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

  return {
    location,
    loading,
    error,
    requestLocation,
    clearLocation: () => {
      setLocation(null);
      setError(null);
    },
  };
}
