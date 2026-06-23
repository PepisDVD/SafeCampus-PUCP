"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@safecampus/ui-kit";
import { Activity, AlertTriangle, CheckCircle2, Copy, Eye, HelpCircle, MessageSquare, MoreHorizontal, PackageCheck, RefreshCw, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { toast } from "@safecampus/ui-kit";
import { lostFoundClient } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfListItem, CustodiaLf, KpisLf } from "../types";

type Props = {
  initialCasos: CasoLfListItem[];
  initialCustodias: CustodiaLf[];
  kpis: KpisLf;
};

const CASE_STATES = ["ABIERTO", "EN_REVISION", "CONFIRMADO", "EN_CUSTODIA", "DEVUELTO", "DESCARTADO", "CERRADO"] as const;

export function LostFoundOperativo({ initialCasos, initialCustodias, kpis }: Props) {
  const [casos, setCasos] = useState(initialCasos);
  const [custodias, setCustodias] = useState(initialCustodias);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const [nextCasos, nextCustodias] = await Promise.all([
        lostFoundClient.casosOperativo(),
        fetchCustodias(),
      ]);
      setCasos(nextCasos.items);
      setCustodias(nextCustodias);
    });
  };

  const closeCustody = (custodia: CustodiaLf, action: "devolver" | "descartar") => {
    startTransition(async () => {
      if (action === "devolver") {
        const reclamante = window.prompt("ID del reclamante verificado");
        if (!reclamante) return;
        await lostFoundClient.devolver(custodia.id, {
          reclamante_id: reclamante,
          metodo_verificacion: "SSO_PUCP_CARNET",
          observaciones: "Devolucion verificada por supervisor",
        });
      } else {
        await lostFoundClient.descartar(custodia.id, {
          motivo: "Vencimiento o decision operativa",
          destino_descarte: "Oficina de Hallazgos",
        });
      }
      setCustodias(await fetchCustodias());
      setCasos((await lostFoundClient.casosOperativo()).items);
      toast.success("Custodia resuelta");
    });
  };

  const copyCaseCode = (codigo: string) => {
    void navigator.clipboard.writeText(codigo);
    toast.success("Codigo copiado");
  };

  const activos = casos.filter((caso) => caso.estado !== "CERRADO").length;
  const devueltos = casos.length >= kpis.total_casos
    ? casos.filter((caso) => caso.estado === "DEVUELTO").length
    : Math.round((kpis.tasa_recuperacion / 100) * kpis.total_casos);
  const stateCounts = CASE_STATES.map((estado) => ({
    estado,
    count: countCasesByState(casos, estado, kpis),
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Dashboard Lost & Found</h1>
          <p className="text-sm text-slate-500">Metricas operativas, custodia y salud del modulo.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={isPending}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi title="Casos totales" value={kpis.total_casos} tone="blue" icon={Activity} />
        <Kpi title="Casos activos" value={activos} tone={activos > 20 ? "amber" : "green"} icon={MessageSquare} />
        <Kpi title="En custodia" value={kpis.en_custodia} tone={kpis.custodias_por_vencer > 0 ? "amber" : "blue"} icon={ShieldCheck} />
        <Kpi
          title="Recuperacion"
          value={`${kpis.tasa_recuperacion}%`}
          subtitle={`${devueltos} de ${kpis.total_casos}`}
          tone={kpis.tasa_recuperacion >= 60 ? "green" : "red"}
          icon={TrendingUp}
          tooltip="Casos devueltos / Total registrado"
        />
      </div>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-950">Resumen por estado</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {stateCounts.map(({ estado, count }) => (
            <div key={estado} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Badge variant="outline" className={estadoLfTone[estado]}>
                {estadoLabel(estado)}
              </Badge>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{count}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><CardTitle>Actividad reciente</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Reportante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Mensajes</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casos.slice(0, 12).map((caso) => (
                  <TableRow key={caso.id}>
                    <TableCell>
                      <Link className="font-medium text-[#001C55] hover:underline" href={`/lost-found-hilos/${caso.id}`}>
                        {caso.codigo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/lost-found-hilos/${caso.id}`}>
                        {caso.titulo}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">{formatDate(caso.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">{shortReporterName(caso.reportante?.nombre_completo)}</TableCell>
                    <TableCell>{tipoLabel(caso.tipo)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoLfTone[caso.estado]}>
                        {estadoLabel(caso.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>{caso.conteo_comentarios}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Acciones para ${caso.codigo}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/lost-found-hilos/${caso.id}`}>
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyCaseCode(caso.codigo)}>
                            <Copy className="h-4 w-4" />
                            Copiar codigo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Custodias activas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {custodias.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">No hay objetos en custodia.</p>
            )}
            {custodias.map((c) => (
              <div key={c.id} className={`rounded-lg border p-3 ${custodyCardClass(c)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.codigo ?? c.caso_id}</p>
                    <p className="text-sm text-slate-500">{c.ubicacion_custodia}</p>
                  </div>
                  <Badge variant="outline" className={custodyBadgeClass(c)}>
                    {isCustodyNearExpiry(c) && <AlertTriangle className="mr-1 h-3.5 w-3.5" />}
                    {custodyLabel(c)}
                  </Badge>
                </div>
                <p className={`mt-2 flex items-center gap-1 text-xs ${isCustodyNearExpiry(c) ? "font-medium text-amber-700" : "text-slate-500"}`}>
                  {isCustodyNearExpiry(c) && <AlertTriangle className="h-3.5 w-3.5" />}
                  Vence: {formatDate(c.fecha_vencimiento)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/lost-found-hilos/${c.caso_id}`}>Ver caso</Link>
                  </Button>
                  <Button size="sm" onClick={() => closeCustody(c, "devolver")}>
                    <PackageCheck className="mr-1 h-4 w-4" />
                    Devolver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => closeCustody(c, "descartar")}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Descartar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const toneClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
};

function Kpi({
  title,
  value,
  subtitle,
  tone,
  icon: Icon,
  tooltip,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  tone: keyof typeof toneClass;
  icon: LucideIcon;
  tooltip?: string;
}) {
  return (
    <Card className={toneClass[tone]}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-white/70 p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium opacity-80">{title}</p>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="rounded-full opacity-80 outline-none transition hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white/80" aria-label={`Informacion de ${title}`}>
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {subtitle && <p className="text-xs font-medium opacity-75">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function countCasesByState(casos: CasoLfListItem[], estado: string, kpis: KpisLf) {
  if (estado === "ABIERTO") return kpis.abiertos;
  if (estado === "EN_CUSTODIA") return kpis.en_custodia;
  if (estado === "CERRADO") return kpis.cerrados;
  return casos.filter((caso) => caso.estado === estado).length;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

function shortReporterName(name?: string | null) {
  if (!name) return "Usuario";
  const [first, second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
}

function isCustodyExpired(custodia: CustodiaLf) {
  return custodia.estado === "VENCIDA" || new Date(custodia.fecha_vencimiento).getTime() < Date.now();
}

function isCustodyNearExpiry(custodia: CustodiaLf) {
  if (custodia.estado !== "ACTIVA") return false;
  const timeLeft = new Date(custodia.fecha_vencimiento).getTime() - Date.now();
  const threshold = custodia.es_perecible ? 6 : 48;
  return timeLeft > 0 && timeLeft <= threshold * 60 * 60 * 1000;
}

function custodyLabel(custodia: CustodiaLf) {
  if (isCustodyExpired(custodia)) return "Vencida";
  if (isCustodyNearExpiry(custodia)) return "Por vencer";
  return estadoLabel(custodia.estado);
}

function custodyBadgeClass(custodia: CustodiaLf) {
  if (custodia.estado === "DESCARTADA" || custodia.estado === "DEVUELTA") return "border-slate-200 bg-slate-100 text-slate-600";
  if (isCustodyExpired(custodia)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (isCustodyNearExpiry(custodia)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function custodyCardClass(custodia: CustodiaLf) {
  if (custodia.estado === "DESCARTADA" || custodia.estado === "DEVUELTA") return "bg-slate-50";
  if (isCustodyExpired(custodia)) return "border-rose-200 bg-rose-50/40";
  if (isCustodyNearExpiry(custodia)) return "border-amber-200 bg-amber-50/40";
  return "border-emerald-200 bg-white";
}

async function fetchCustodias() {
  const { api } = await import("@/lib/api/client");
  const response = await api.get<{ items: CustodiaLf[] }>("/lost-found/custodias", { params: { per_page: "8" } });
  return response.items;
}
