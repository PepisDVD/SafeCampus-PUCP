"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@safecampus/ui-kit";
import { AlertTriangle, ChevronRight, ClipboardList, MapPin } from "lucide-react";

import { incidentesApi, type IncidenteListItemApi } from "@/lib/api/incidentes";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MisCasosPage() {
  const [items, setItems] = useState<IncidenteListItemApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void incidentesApi
      .list({ mine: true, limit: 50 })
      .then((response) => {
        if (active) setItems(response.items);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible cargar tus casos",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#001C55]">Mis Casos</h1>
          <p className="text-sm text-muted-foreground">Seguimiento de tus reportes e incidentes.</p>
        </div>
        <Button asChild className="bg-[#001C55] hover:bg-[#032E84]">
          <Link href="/reportar">Reportar</Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Cargando tus casos...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="rounded-full bg-slate-100 p-3 text-slate-500">
              <ClipboardList className="h-6 w-6" />
            </div>
            <CardTitle>Aun no tienes casos registrados</CardTitle>
            <CardDescription>Cuando reportes un incidente, aparecera aqui.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/incidentes/${item.id}`}>
              <Card className="transition hover:border-[#001C55]/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="mt-1 rounded-lg bg-[#001C55]/10 p-2 text-[#001C55]">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-semibold text-[#001C55]">{item.codigo}</p>
                      <Badge variant="secondary">{item.estado.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{item.titulo}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(item.fecha_registro)}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.zona ?? "Sin ubicacion textual"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mt-2 h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
