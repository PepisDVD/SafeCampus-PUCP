/**
 * Mapa tactico de incidentes.
 *
 * Server Component: obtiene incidentes via backend FastAPI. No accede a la BD.
 */

import { MapaTacticoIncidentes } from "@/features/incidentes/components/mapa-tactico-incidentes";
import { listarIncidentesMapa } from "@/features/incidentes/service";

export default async function MapaPage() {
  const data = await listarIncidentesMapa({
    activos_only: false,
    limit: 300,
  }).catch(() => ({
    items: [],
    total: 0,
    georreferenciados: 0,
    sin_coordenadas: 0,
  }));

  return (
    <div className="p-6">
      <MapaTacticoIncidentes data={data} />
    </div>
  );
}
