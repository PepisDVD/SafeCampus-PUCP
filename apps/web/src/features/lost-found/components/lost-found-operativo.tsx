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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";
import { Activity, AlertTriangle, CheckCircle2, MessageSquare, PackageCheck, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { lostFoundClient } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfListItem, CustodiaLf, KpisLf } from "../types";

type Props = {
  initialCasos: CasoLfListItem[];
  initialCustodias: CustodiaLf[];
  kpis: KpisLf;
};

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

  const activos = casos.filter((caso) => caso.estado !== "CERRADO").length;

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
        <Kpi title="Recuperacion" value={`${kpis.tasa_recuperacion}%`} tone={kpis.tasa_recuperacion >= 60 ? "green" : "red"} icon={TrendingUp} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><CardTitle>Actividad reciente</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Mensajes</TableHead>
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
                    <TableCell>{tipoLabel(caso.tipo)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoLfTone[caso.estado]}>
                        {estadoLabel(caso.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>{caso.conteo_comentarios}</TableCell>
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
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.codigo ?? c.caso_id}</p>
                    <p className="text-sm text-slate-500">{c.ubicacion_custodia}</p>
                  </div>
                  <Badge variant="secondary">{estadoLabel(c.estado)}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">Vence: {new Date(c.fecha_vencimiento).toLocaleString()}</p>
                <div className="mt-3 flex gap-2">
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
  tone,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  tone: keyof typeof toneClass;
  icon: typeof AlertTriangle;
}) {
  return (
    <Card className={toneClass[tone]}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-white/70 p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchCustodias() {
  const { api } = await import("@/lib/api/client");
  const response = await api.get<{ items: CustodiaLf[] }>("/lost-found/custodias", { params: { per_page: "8" } });
  return response.items;
}
