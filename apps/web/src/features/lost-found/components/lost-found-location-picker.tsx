"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Skeleton,
  Slider,
} from "@safecampus/ui-kit";
import { MapPin } from "lucide-react";
import type { PickedPoint } from "./lost-found-location-picker-map";

// Leaflet necesita `window`; se carga solo en cliente.
const LocationPickerMap = dynamic(() => import("./lost-found-location-picker-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export type LocationSelection = { lat: number; lng: number; radio_km: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LocationSelection | null;
  onApply: (value: LocationSelection | null) => void;
};

// El control trabaja en metros (pasos finos); se convierte a km solo al aplicar.
const DEFAULT_RADIUS_M = 150;
const MIN_RADIUS_M = 50;
const MAX_RADIUS_M = 300;
const STEP_RADIUS_M = 10;

/** Etiqueta del radio: metros hasta 999 m, luego km. */
export function formatRadius(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function LostFoundLocationPicker({ open, onOpenChange, value, onApply }: Props) {
  const [point, setPoint] = useState<PickedPoint | null>(value ? { lat: value.lat, lng: value.lng } : null);
  const [radiusM, setRadiusM] = useState<number>(value ? value.radio_km * 1000 : DEFAULT_RADIUS_M);

  // Resincroniza con el valor vigente al abrir (ajuste de estado en render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPoint(value ? { lat: value.lat, lng: value.lng } : null);
      setRadiusM(value ? value.radio_km * 1000 : DEFAULT_RADIUS_M);
    }
  }

  const apply = () => {
    onApply(point ? { lat: point.lat, lng: point.lng, radio_km: radiusM / 1000 } : null);
    onOpenChange(false);
  };

  const clear = () => {
    onApply(null);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle>Filtrar por ubicación</DrawerTitle>
            <DrawerDescription>
              Toca un punto en el mapa y ajusta el radio para ver objetos cercanos.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4">
            <div className="h-72 w-full overflow-hidden rounded-xl border">
              <LocationPickerMap point={point} radiusKm={radiusM / 1000} onPick={setPoint} />
            </div>
          </div>

          <div className="space-y-2 px-4 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="h-4 w-4 text-[#001C55]" /> Radio de búsqueda
              </span>
              <span className="font-semibold text-[#001C55]">{formatRadius(radiusM)}</span>
            </div>
            <Slider
              min={MIN_RADIUS_M}
              max={MAX_RADIUS_M}
              step={STEP_RADIUS_M}
              value={[radiusM]}
              onValueChange={([next]) => setRadiusM(next ?? DEFAULT_RADIUS_M)}
              disabled={!point}
            />
            {!point && <p className="text-xs text-slate-500">Selecciona un punto en el mapa para activar el radio.</p>}
          </div>

          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={clear}>Quitar ubicación</Button>
            <Button className="flex-1" onClick={apply} disabled={!point}>Aplicar</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
