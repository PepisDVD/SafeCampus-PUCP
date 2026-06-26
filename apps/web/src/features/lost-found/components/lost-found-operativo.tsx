"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FilterBar,
  Input,
  Label,
  MultiSelectFilter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  cn,
} from "@safecampus/ui-kit";

import { lostFoundClient } from "../client";
import { estadoLabel, formatDateTimePe, tipoLabel } from "../presentation";
import { EstadoLfBadge } from "./estado-lf-badge";
import type { CategoriaLf, DashboardLf } from "../types";

type DashboardFilters = {
  fecha_desde: string;
  fecha_hasta: string;
  categorias: string[];
  estados: string[];
  tipo: string;
};

type Props = {
  initialDashboard: DashboardLf;
  categorias: CategoriaLf[];
  initialFilters: Pick<DashboardFilters, "fecha_desde" | "fecha_hasta">;
};

const STATE_OPTIONS = [
  "ABIERTO",
  "EN_REVISION",
  "CONFIRMADO",
  "EN_CUSTODIA",
  "DEVUELTO",
  "DESCARTADO",
  "CERRADO",
].map((value) => ({ value, label: estadoLabel(value) }));

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b", "#06b6d4"];
const STATE_COLORS: Record<string, string> = {
  ABIERTO: "#10b981",
  EN_REVISION: "#f59e0b",
  CONFIRMADO: "#f97316",
  EN_CUSTODIA: "#0ea5e9",
  DEVUELTO: "#14b8a6",
  DESCARTADO: "#ef4444",
  CERRADO: "#64748b",
};

export function LostFoundOperativo({ initialDashboard, categorias, initialFilters }: Props) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [filters, setFilters] = useState<DashboardFilters>({
    ...initialFilters,
    categorias: [],
    estados: [],
    tipo: "TODOS",
  });
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const next = await lostFoundClient.dashboard(buildDashboardParams(filters));
          setDashboard(next);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudo actualizar el dashboard.");
        }
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const categoryOptions = useMemo(
    () => categorias.map((item) => ({ value: item.id, label: item.nombre })),
    [categorias],
  );

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
      </div>

      <FilterBar className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[1.25fr_1fr_1fr_0.8fr_auto]">
        <DateRangeFilter
          from={filters.fecha_desde}
          to={filters.fecha_hasta}
          onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        />
        <FilterField label="Categorías">
          <MultiSelectFilter
            options={categoryOptions}
            selected={filters.categorias}
            onChange={(categorias) => setFilters((current) => ({ ...current, categorias }))}
            placeholder="Todas"
            className="rounded-md"
          />
        </FilterField>
        <FilterField label="Estados">
          <MultiSelectFilter
            options={STATE_OPTIONS}
            selected={filters.estados}
            onChange={(estados) => setFilters((current) => ({ ...current, estados }))}
            placeholder="Todos"
            className="rounded-md"
          />
        </FilterField>
        <FilterField label="Tipo">
          <Select value={filters.tipo} onValueChange={(tipo) => setFilters((current) => ({ ...current, tipo }))}>
            <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PERDIDO">Perdido</SelectItem>
              <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <div className="flex items-end">
          <Button variant="outline" className="w-full xl:w-auto" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </FilterBar>

      <div className={cn("space-y-4 transition-opacity", isPending && "opacity-65")}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <KpiCard title="Casos totales" metric={dashboard.casos_totales} icon={Activity} tone="blue" />
          <KpiCard title="Casos activos" metric={dashboard.casos_activos} icon={TrendingUp} tone="green" />
          <KpiCard title="En custodia" metric={dashboard.en_custodia} icon={ShieldCheck} tone="blue" />
          <KpiCard title="Por vencer" metric={dashboard.por_vencer} icon={Clock3} tone="amber" />
          <KpiCard title="Tasa de recuperación" metric={dashboard.tasa_recuperacion} icon={TrendingUp} tone="rose" suffix="%" />
          <KpiCard title="Tiempo prom. de devolución" metric={dashboard.tiempo_promedio_devolucion} icon={TimerReset} tone="violet" suffix=" días" />
        </div>

        <div className="grid min-w-0 gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
          <ChartCard title="Casos registrados vs devueltos">
            <CasesLineChart data={dashboard.serie} />
          </ChartCard>
          <ChartCard title="Tiempo promedio en custodia por categoría">
            <CustodyBarChart data={dashboard.custodia_por_categoria} />
          </ChartCard>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <ChartCard title="Distribución por categoría">
            <DonutChart data={dashboard.por_categoria} />
          </ChartCard>
          <ChartCard title="Distribución por estado">
            <DonutChart data={dashboard.por_estado} colors={dashboard.por_estado.map((item) => STATE_COLORS[item.clave] ?? "#64748b")} />
          </ChartCard>
          <ChartCard title="Hilos encontrados vs perdidos">
            <DonutChart data={dashboard.por_tipo} colors={["#0ea5e9", "#f59e0b"]} />
          </ChartCard>
        </div>

        <div className="grid min-w-0 gap-4 2xl:grid-cols-[1fr_1.25fr]">
          <ChartCard title="Antigüedad de casos">
            <AgeChart data={dashboard.antiguedad} />
          </ChartCard>
          <CriticalCustodies items={dashboard.custodias_criticas} />
        </div>

        <RecentActivity items={dashboard.actividad_reciente} />
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (patch: Partial<DashboardFilters>) => void;
}) {
  return (
    <FilterField label="Rango de fechas">
      <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Input type="date" value={from} max={to} onChange={(event) => onChange({ fecha_desde: event.target.value })} />
        <span className="hidden text-slate-400 sm:block">–</span>
        <Input type="date" value={to} min={from} onChange={(event) => onChange({ fecha_hasta: event.target.value })} />
      </div>
    </FilterField>
  );
}

const KPI_TONES = {
  blue: "border-blue-200 bg-blue-50/60 text-blue-700",
  green: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
  amber: "border-amber-200 bg-amber-50/60 text-amber-700",
  rose: "border-rose-200 bg-rose-50/60 text-rose-700",
  violet: "border-violet-200 bg-violet-50/60 text-violet-700",
};

function KpiCard({
  title,
  metric,
  icon: Icon,
  tone,
  suffix = "",
}: {
  title: string;
  metric: DashboardLf["casos_totales"];
  icon: typeof Activity;
  tone: keyof typeof KPI_TONES;
  suffix?: string;
}) {
  const variation = metric.variacion;
  const positive = variation != null && variation >= 0;
  return (
    <Card className={KPI_TONES[tone]}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <span className="rounded-full bg-white/70 p-2.5"><Icon className="h-5 w-5" /></span>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 2xl:text-4xl">{formatMetric(metric.valor)}{suffix}</p>
        <div className="mt-3 flex min-h-4 items-center gap-1 text-xs text-slate-500">
          {variation != null && (
            <>
              {positive ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />}
              <span className={positive ? "text-emerald-700" : "text-rose-700"}>{Math.abs(variation)}%</span>
              <span>vs. período anterior</span>
            </>
          )}
          {variation == null && <span>{metric.detalle ?? "Sin período comparable"}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-1"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  );
}

function CasesLineChart({ data }: { data: DashboardLf["serie"] }) {
  return (
    <div className="h-80 min-h-80 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="fecha" tickFormatter={shortDate} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <RechartsTooltip labelFormatter={(value) => formatDateLabel(String(value))} />
          <Legend iconType="circle" iconSize={8} />
          <Line type="monotone" dataKey="registrados" name="Registrados" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="devueltos" name="Devueltos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutChart({
  data,
  colors = CHART_COLORS,
}: {
  data: DashboardLf["por_categoria"];
  colors?: string[];
}) {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  if (!total) return <EmptyChart />;
  return (
    <div className="grid min-h-60 min-w-0 items-center gap-3 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className="relative h-52 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="etiqueta" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
              {data.map((item, index) => <Cell key={item.clave} fill={colors[index % colors.length]} />)}
            </Pie>
            <RechartsTooltip formatter={(value) => [`${value} casos`, ""]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-950">{total}</span>
          <span className="text-[10px] text-slate-500">Total</span>
        </div>
      </div>
      <ul className="space-y-2 text-xs">
        {data.slice(0, 7).map((item, index) => (
          <li key={item.clave} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="truncate">{item.clave in STATE_COLORS ? estadoLabel(item.clave) : item.etiqueta}</span>
            </span>
            <span className="font-semibold">{Math.round(item.total / total * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustodyBarChart({ data }: { data: DashboardLf["custodia_por_categoria"] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <div className="h-80 min-h-80 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <BarChart data={data} margin={{ top: 16, right: 8, left: -20, bottom: 18 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="categoria" tick={{ fontSize: 9 }} interval={0} angle={-12} textAnchor="end" axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <RechartsTooltip formatter={(value) => [`${value} días`, "Promedio"]} />
          <Bar dataKey="dias_promedio" radius={[5, 5, 0, 0]}>
            {data.map((item, index) => <Cell key={item.categoria} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AgeChart({ data }: { data: DashboardLf["antiguedad"] }) {
  const colors = ["#6ee7b7", "#fcd34d", "#fb923c", "#f43f5e"];
  return (
    <div className="h-80 min-h-80 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis type="category" dataKey="rango" width={72} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <RechartsTooltip formatter={(value) => [`${value} casos`, ""]} />
          <Bar dataKey="total" radius={[0, 5, 5, 0]}>
            {data.map((item, index) => <Cell key={item.rango} fill={colors[index]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CriticalCustodies({ items }: { items: DashboardLf["custodias_criticas"] }) {
  return (
    <Card className="border-rose-200">
      <CardHeader className="flex-row items-center justify-between border-b border-rose-100 bg-rose-50/60 pb-3">
        <CardTitle className="text-sm text-rose-700">Custodias críticas / Próximas a vencer</CardTitle>
        <Link href="/lost-found-logistica" className="text-xs font-medium text-rose-700 hover:underline">Ver todas</Link>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {items.length === 0 && <p className="p-5 text-sm text-slate-500">No hay custodias críticas en el período.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100"><ShieldCheck className="h-5 w-5 text-slate-500" /></div>
            <div className="min-w-0 flex-1">
              <Link href={`/lost-found-hilos/${item.caso_id}`} className="block truncate text-xs font-semibold text-[#001C55] hover:underline">{item.codigo}</Link>
              <p className="truncate text-xs text-slate-600">{item.titulo}</p>
              <p className="text-[10px] text-slate-400">Vence: {formatDateTimePe(item.fecha_vencimiento)}</p>
            </div>
            <span className={cn("text-xs font-semibold", item.dias_restantes <= 0 ? "text-rose-700" : "text-amber-700")}>
              {item.dias_restantes <= 0 ? "Vencida" : `${item.dias_restantes} días`}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ items }: { items: DashboardLf["actividad_reciente"] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Actividad reciente</CardTitle>
        <Button asChild size="sm" variant="outline"><Link href="/lost-found-logistica">Ver todo</Link></Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Objeto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Días en custodia</TableHead>
              <TableHead>Matching</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead>Reportante</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell><Link href={`/lost-found-hilos/${item.id}`} className="font-medium text-[#001C55] hover:underline">{item.codigo}</Link></TableCell>
                <TableCell className="max-w-64 truncate font-medium">{item.titulo}</TableCell>
                <TableCell>{tipoLabel(item.tipo)}</TableCell>
                <TableCell><EstadoLfBadge estado={item.estado} /></TableCell>
                <TableCell>{item.dias_en_custodia == null ? "—" : `${item.dias_en_custodia} días`}</TableCell>
                <TableCell>{item.matching_confirmado ? "Confirmado" : item.matching_total ? `${item.matching_total} sugerencias` : "Sin sugerencias"}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTimePe(item.created_at)}</TableCell>
                <TableCell>{shortName(item.reportante)}</TableCell>
                <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/lost-found-hilos/${item.id}`}>Ver caso</Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Sin datos para los filtros seleccionados</div>;
}

function buildDashboardParams(filters: DashboardFilters) {
  const params: Record<string, string> = {
    fecha_desde: filters.fecha_desde,
    fecha_hasta: filters.fecha_hasta,
  };
  if (filters.categorias.length) params.categoria = filters.categorias.join(",");
  if (filters.estados.length) params.estado = filters.estados.join(",");
  if (filters.tipo !== "TODOS") params.tipo = filters.tipo;
  return params;
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? value.toLocaleString("es-PE") : value.toLocaleString("es-PE", { maximumFractionDigits: 1 });
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function shortName(value: string) {
  const [first, second] = value.trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
}
