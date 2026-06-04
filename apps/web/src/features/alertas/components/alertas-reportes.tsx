"use client";

import { BarChart3, MapPinned, RadioTower, Send, ShieldAlert } from "lucide-react";
import type { AlertasStatsResponse, GisHeatmapResponse } from "@safecampus/shared-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "@safecampus/ui-kit";

type Props = {
  stats: AlertasStatsResponse;
  heatmap: GisHeatmapResponse;
};

export function AlertasReportes({ stats, heatmap }: Props) {
  const successPct = stats.entregas_total
    ? Math.round((stats.entregas_enviadas / stats.entregas_total) * 100)
    : 0;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reportes de alertas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Analitica operativa por estado, canal, severidad y distribucion geografica.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Alertas" value={stats.total} icon={ShieldAlert} />
        <Metric title="Entregas" value={stats.entregas_total} icon={Send} />
        <Metric title="Enviadas" value={stats.entregas_enviadas} icon={RadioTower} />
        <Metric title="Fallidas" value={stats.entregas_fallidas} icon={BarChart3} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cumplimiento de entrega</CardTitle>
          <CardDescription>{successPct}% de entregas marcadas como enviadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={successPct} />
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Breakdown title="Por estado" data={stats.por_estado} />
        <Breakdown title="Por canal" data={stats.por_canal} />
        <Breakdown title="Por severidad" data={stats.por_severidad} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinned className="h-4 w-4 text-[#001C55]" />
            Puntos GIS de alertas
          </CardTitle>
          <CardDescription>
            {heatmap.total} punto{heatmap.total === 1 ? "" : "s"} georreferenciados para capas de calor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {heatmap.points.slice(0, 9).map((point, index) => (
              <div key={`${point.latitud}-${point.longitud}-${index}`} className="rounded-lg border p-3 text-sm">
                <p className="font-mono text-xs text-slate-500">
                  {point.latitud.toFixed(5)}, {point.longitud.toFixed(5)}
                </p>
                <p className="mt-1 text-slate-700">Peso GIS: {point.peso.toFixed(2)}</p>
              </div>
            ))}
            {heatmap.points.length === 0 && (
              <p className="text-sm text-slate-500">No hay alertas georreferenciadas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: typeof ShieldAlert }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs tracking-wide text-slate-500 uppercase">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="rounded-lg bg-[#001C55]/10 p-2 text-[#001C55]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Sin datos.</p>
        ) : (
          entries.map(([label, value]) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-950">{value}</span>
              </div>
              <Progress value={(value / max) * 100} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
