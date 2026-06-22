"use client";

import { ReadonlyLocationMap } from "@/components/maps/readonly-location-map";

type Props = {
  lat: number;
  lng: number;
};

export function LostFoundReadonlyMap({ lat, lng }: Props) {
  return <ReadonlyLocationMap lat={lat} lng={lng} className="min-h-96" />;
}
