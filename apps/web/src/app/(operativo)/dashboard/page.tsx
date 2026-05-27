/**
 * 📁 apps/web/src/app/(operativo)/dashboard/page.tsx
 * 🎯 Dashboard operativo — métricas, feed de activos, top zonas y tabla reciente.
 * 📦 Módulo: Operativo / Dashboard
 *
 * Server Component: obtiene stats + lista vía backend (FastAPI → sc_incidentes).
 * No accede a la BD directamente.
 */

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from "@safecampus/ui-kit";
import {
  EstadoIncidente,
  type IncidenteListItem,
} from "@safecampus/shared-types";
import {
  AlertTriangle,
  BotMessageSquare,
  ChevronRight,
  Clock3,
  MessageSquare,
  ShieldCheck,
  Siren,
  Users,
} from "lucide-react";

import {
  listarIncidentes,
  listarIncidentesMapa,
  obtenerStats,
} from "@/features/incidentes/service";
import { obtenerOmnicanalStats } from "@/features/whatsapp/service";
import { IncidentesLineChart } from "@/components/charts/incidentes-line-chart";
import { IncidentesHeatmapCard } from "@/features/incidentes/components/incidentes-heatmap-card";
import {
  SEVERIDAD_COLOR,
  SEVERIDAD_LABEL,
} from "@/features/incidentes/presentation";

const ESTADOS_TERMINALES = new Set<EstadoIncidente>([
  EstadoIncidente.RESUELTO,
  EstadoIncidente.CERRADO,
]);

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: typeof AlertTriangle;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneStyles: Record<typeof tone, string> = {
    default: "bg-[#001C55]/10 text-[#001C55]",
    danger: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
  };
  return (
    <Card>
      <CardContent className="flex items-start justify-between pt-6">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={cn("rounded-xl p-2", toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [stats, recientes, mapaData, chatStats] = await Promise.all([
    obtenerStats().catch(() => ({
      total: 0,
      activos: 0,
      criticos: 0,
      en_atencion: 0,
      resueltos_24h: 0,
      por_zona: [],
    })),
    listarIncidentes({ limit: 20 }).catch(() => ({
      items: [] as IncidenteListItem[],
      total: 0,
    })),
    listarIncidentesMapa({ limit: 300, activos_only: false }).catch(() => ({
      items: [],
      total: 0,
      georreferenciados: 0,
      sin_coordenadas: 0,
    })),
    obtenerOmnicanalStats().catch(() => ({
      en_bot: 0,
      en_cola: 0,
      en_atencion: 0,
      abierta: 0,
      total_activos: 0,
    })),
  ]);

  const activos = recientes.items
    .filter((item) => !ESTADOS_TERMINALES.has(item.estado))
    .slice(0, 6);

  return (
    <div className="w-full min-w-0 space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#001C55]">
            Dashboard operativo
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoreo de incidentes en tiempo real del campus.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Incidentes activos"
          value={stats.activos}
          hint="Con seguimiento en curso"
          icon={Siren}
        />
        <MetricCard
          title="Críticos"
          value={stats.criticos}
          hint="Severidad máxima"
          icon={AlertTriangle}
          tone="danger"
        />
        <MetricCard
          title="En atención"
          value={stats.en_atencion}
          hint="Operadores asignados"
          icon={Clock3}
          tone="warning"
        />
        <MetricCard
          title="Resueltos 24h"
          value={stats.resueltos_24h}
          hint="Cerrados en las últimas 24 horas"
          icon={ShieldCheck}
          tone="success"
        />
      </section>

      {/* Chatbot — chats activos */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <BotMessageSquare className="h-4 w-4 text-[#001C55]" />
          <h2 className="text-sm font-semibold text-slate-700">
            Chatbot WhatsApp
          </h2>
          <Link
            href="/mensajes"
            className="ml-auto flex items-center gap-0.5 text-xs font-medium text-[#001C55]"
          >
            Ver consola <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Chats activos"
            value={chatStats.total_activos}
            hint="En bot, cola o atención"
            icon={MessageSquare}
          />
          <MetricCard
            title="En bot"
            value={chatStats.en_bot}
            hint="Atendidos por IA"
            icon={BotMessageSquare}
          />
          <MetricCard
            title="En cola"
            value={chatStats.en_cola}
            hint="Esperando operador"
            icon={Users}
            tone="warning"
          />
          <MetricCard
            title="En atención humana"
            value={chatStats.en_atencion}
            hint="Con operador asignado"
            icon={Clock3}
            tone="success"
          />
        </div>
      </section>

      {/* Mapa de calor + Feed */}
      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <IncidentesHeatmapCard items={mapaData.items} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Feed de incidentes activos</span>
              <Link
                href="/incidentes"
                className="flex items-center gap-0.5 text-xs font-medium text-[#001C55]"
              >
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay incidentes activos.
              </p>
            ) : (
              activos.map((item) => {
                const severidadColor = item.severidad
                  ? SEVERIDAD_COLOR[item.severidad]
                  : "bg-slate-300";
                return (
                  <Link
                    key={item.id}
                    href={`/incidentes/${item.id}`}
                    className="block rounded-lg border p-3 transition hover:bg-slate-50"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-mono text-xs font-semibold text-muted-foreground">
                        {item.codigo}
                      </p>
                      {item.severidad && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span
                            aria-hidden
                            className={cn(
                              "h-2 w-2 rounded-full",
                              severidadColor,
                            )}
                          />
                          {SEVERIDAD_LABEL[item.severidad]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{item.titulo}</p>
                    {item.lugar_referencia && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.lugar_referencia}
                      </p>
                    )}
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      {/* Gráfico de evolución */}
      <IncidentesLineChart />

    </div>
  );
}