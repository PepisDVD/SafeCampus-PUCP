"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@safecampus/ui-kit";
import { AlertTriangle, ArrowLeft, Clock, FileText, MapPin, Paperclip } from "lucide-react";

import { incidentesApi, type IncidenteDetailResponse } from "@/lib/api/incidentes";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function IncidenteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [incident, setIncident] = useState<IncidenteDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void incidentesApi
      .get(id)
      .then((response) => {
        if (active) setIncident(response);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible cargar el incidente",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando expediente...</div>;
  }

  if (error || !incident) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/incidentes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error || "No se encontro el incidente solicitado"}</p>
        </div>
      </div>
    );
  }

  const firstLocation = incident.ubicaciones[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/incidentes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Bandeja
            </Link>
          </Button>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{incident.codigo}</p>
            <h1 className="text-2xl font-bold text-slate-950">{incident.titulo}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{incident.estado.replaceAll("_", " ")}</Badge>
          <Badge variant="secondary">{incident.canal_origen}</Badge>
          {incident.severidad && <Badge variant="outline">{incident.severidad}</Badge>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descripcion original</CardTitle>
              <CardDescription>
                Reportado por {incident.reportante_nombre} el {formatDate(incident.fecha_registro)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-700">{incident.descripcion}</p>
              <Separator />
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Ubicacion</p>
                  <p className="text-sm font-medium">{incident.lugar_referencia ?? "Sin referencia textual"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Operador</p>
                  <p className="text-sm font-medium">{incident.operador_nombre ?? "Sin asignar"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial del expediente</CardTitle>
              <CardDescription>Trazabilidad operativa del incidente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {incident.historial.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
              ) : (
                incident.historial.map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-lg border p-3">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#001C55]/10 text-[#001C55]">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{event.accion.replaceAll("_", " ")}</p>
                        <Badge variant="secondary">{event.estado_nuevo.replaceAll("_", " ")}</Badge>
                      </div>
                      {event.comentario && (
                        <p className="mt-1 text-sm text-muted-foreground">{event.comentario}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(event.created_at)} · {event.ejecutado_por_nombre ?? "Sistema"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ubicacion</CardTitle>
              <CardDescription>Referencia y coordenadas registradas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#001C55]" />
                <div>
                  <p className="text-sm font-medium">{incident.lugar_referencia ?? "Sin referencia textual"}</p>
                  {firstLocation?.latitud && firstLocation?.longitud && (
                    <p className="text-xs text-muted-foreground">
                      {firstLocation.latitud}, {firstLocation.longitud}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evidencias</CardTitle>
              <CardDescription>Archivos asociados al reporte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {incident.evidencias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay evidencias adjuntas.</p>
              ) : (
                incident.evidencias.map((item) => (
                  <a
                    key={item.id}
                    href={item.url_archivo}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-slate-50"
                  >
                    <Paperclip className="h-4 w-4 text-[#001C55]" />
                    <span className="min-w-0 flex-1 truncate">{item.nombre_archivo}</span>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del expediente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Categoria: {incident.categoria ?? "Sin clasificar"}</span>
              </div>
              <p className="text-muted-foreground">Actualizado: {formatDate(incident.updated_at)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
