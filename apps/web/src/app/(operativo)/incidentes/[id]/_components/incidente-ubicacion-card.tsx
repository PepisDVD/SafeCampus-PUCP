"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@safecampus/ui-kit";

const ReadonlyLocationMap = dynamic(
  () =>
    import("@/components/maps/readonly-location-map").then(
      (mod) => mod.ReadonlyLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-72 items-center justify-center bg-slate-100 text-sm text-slate-500">
        Cargando ubicacion...
      </div>
    ),
  },
);

type IncidenteUbicacionCardProps = {
  latitud: number | null;
  longitud: number | null;
  lugarReferencia: string | null;
};

export function IncidenteUbicacionCard({
  latitud,
  longitud,
  lugarReferencia,
}: IncidenteUbicacionCardProps) {
  const hasCoordinates = latitud !== null && longitud !== null;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#001C55]" />
          <h2 className="text-base font-semibold text-slate-900">
            Ubicacion del incidente
          </h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {lugarReferencia ?? "Sin referencia de ubicacion"}
        </p>
      </div>

      {hasCoordinates ? (
        <>
          <div className="border-y border-slate-200">
            <ReadonlyLocationMap
              lat={latitud}
              lng={longitud}
              interactive
              markerColor="#ef4444"
            />
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="font-mono text-xs text-slate-500">
              {latitud.toFixed(6)}, {longitud.toFixed(6)}
            </p>
            <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
              <a
                href={`https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=18/${latitud}/${longitud}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ampliar
              </a>
            </Button>
          </div>
        </>
      ) : (
        <div className="mx-5 mb-5 flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
          <MapPin className="mb-2 h-7 w-7 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            Este incidente no tiene coordenadas registradas.
          </p>
        </div>
      )}
    </section>
  );
}
