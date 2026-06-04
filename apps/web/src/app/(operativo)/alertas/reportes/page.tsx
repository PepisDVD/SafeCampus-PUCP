import { AlertasReportes } from "@/features/alertas/components/alertas-reportes";
import { consultarGisHeatmap, obtenerAlertasStats } from "@/features/alertas/service";

const EMPTY_STATS = {
  total: 0,
  por_estado: {},
  por_canal: {},
  por_severidad: {},
  entregas_total: 0,
  entregas_enviadas: 0,
  entregas_fallidas: 0,
};

export default async function AlertasReportesPage() {
  const [stats, heatmap] = await Promise.all([
    obtenerAlertasStats().catch(() => EMPTY_STATS),
    consultarGisHeatmap("alertas").catch(() => ({ points: [], total: 0 })),
  ]);

  return <AlertasReportes stats={stats} heatmap={heatmap} />;
}
