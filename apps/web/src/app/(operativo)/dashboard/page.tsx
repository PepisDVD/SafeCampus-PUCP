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
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@safecampus/ui-kit";
import {
  EstadoIncidente,
  type IncidenteListItem,
} from "@safecampus/shared-types";
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  MapPin,
  ShieldCheck,
  Siren,
} from "lucide-react";

import { listarIncidentes, obtenerStats } from "@/features/incidentes/service";
import {
  ESTADO_STYLE,
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
  const [stats, recientes] = await Promise.all([
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
  ]);

  const activos = recientes.items
    .filter((item) => !ESTADOS_TERMINALES.has(item.estado))
    .slice(0, 6);
  const tablaRecientes = recientes.items.slice(0, 10);
  const maxZonaTotal = stats.por_zona.reduce(
    (max, z) => (z.total > max ? z.total : max),
    0,
  );

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

      {/* Top zonas + Feed */}
      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-[#001C55]" />
              Top zonas con más incidentes
            </CardTitle>
            <CardDescription>
              Lugares con más casos abiertos en el campus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.por_zona.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No hay zonas con incidentes abiertos.
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.por_zona.map((z) => {
                  const pct =
                    maxZonaTotal > 0
                      ? Math.round((z.total / maxZonaTotal) * 100)
                      : 0;
                  return (
                    <li key={z.zona} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-900">
                          {z.zona}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {z.total}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#001C55]"
                          style={{ width: `${pct}%` }}
                          aria-hidden
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

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

      {/* Tabla reciente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Incidentes recientes</span>
            <Link
              href="/incidentes"
              className="flex items-center gap-0.5 text-xs font-medium text-[#001C55]"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {tablaRecientes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay incidentes registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Operador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablaRecientes.map((item) => {
                  const estadoStyle = ESTADO_STYLE[item.estado];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">
                        {item.codigo}
                      </TableCell>
                      <TableCell>{item.titulo}</TableCell>
                      <TableCell className="text-slate-600">
                        {item.lugar_referencia ?? "—"}
                      </TableCell>
                      <TableCell>
                        {item.severidad ? (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <span
                              aria-hidden
                              className={cn(
                                "h-2 w-2 rounded-full",
                                SEVERIDAD_COLOR[item.severidad],
                              )}
                            />
                            {SEVERIDAD_LABEL[item.severidad]}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
                            estadoStyle.className,
                          )}
                        >
                          {estadoStyle.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.operador_nombre ?? (
                          <span className="text-slate-400">Sin asignar</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}