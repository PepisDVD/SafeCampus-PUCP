/**
 * Detalle de un reporte propio de comunidad.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Clock, MapPin } from "lucide-react";
import { Badge, Card, cn } from "@safecampus/ui-kit";

import { IncidenteComunicacion } from "@/features/incidentes/components/incidente-comunicacion";
import {
  obtenerMiDetalleIncidente,
} from "@/features/incidentes/service";
import {
  ESTADO_STYLE,
  formatCategoria,
} from "@/features/incidentes/presentation";

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "Pendiente";
  try {
    return new Date(iso).toLocaleString("es-PE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Pendiente";
  }
}

export default async function ComunidadCasoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detalle;
  try {
    detalle = await obtenerMiDetalleIncidente(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("404") || /no encontrado/i.test(message)) {
      notFound();
    }
    throw error;
  }

  const estadoStyle = ESTADO_STYLE[detalle.estado];

  return (
    <div className="space-y-5 px-4 py-5">
      <Link
        href="/mis-casos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis reportes
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="bg-[#001C55] p-5 text-white">
          <p className="font-mono text-xs font-semibold text-white/75">
            {detalle.codigo}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-tight">
            {detalle.titulo}
          </h1>
          <Badge
            className={cn(
              "mt-3 rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
              estadoStyle.className,
            )}
          >
            {estadoStyle.label}
          </Badge>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {detalle.descripcion ?? "No se agrego descripcion al reporte."}
          </p>
          <div className="grid gap-3 text-sm">
            <div className="flex gap-2 text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
              <span>{detalle.lugar_referencia ?? "Sin ubicacion"}</span>
            </div>
            <div className="flex gap-2 text-slate-600">
              <CalendarClock className="mt-0.5 h-4 w-4 text-slate-400" />
              <span>Reportado: {formatFecha(detalle.created_at)}</span>
            </div>
            <div className="flex gap-2 text-slate-600">
              <Clock className="mt-0.5 h-4 w-4 text-slate-400" />
              <span>Primera respuesta: {formatFecha(detalle.fecha_primera_respuesta)}</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Categoria:{" "}
            <span className="font-semibold text-slate-700">
              {formatCategoria(detalle.categoria)}
            </span>
          </div>
        </div>
      </Card>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Trazabilidad
        </h2>
        <ol className="mt-4 space-y-3">
          {detalle.historial.map((evento) => (
            <li key={evento.id} className="border-l-2 border-[#001C55]/20 pl-3">
              <p className="text-sm font-semibold text-slate-900">
                {evento.accion}
              </p>
              <p className="text-xs text-slate-500">
                {formatFecha(evento.created_at)}
              </p>
              {evento.comentario && (
                <p className="mt-1 text-sm text-slate-600">
                  {evento.comentario}
                </p>
              )}
            </li>
          ))}
          {detalle.historial.length === 0 && (
            <p className="text-sm text-slate-500">
              Aun no hay movimientos registrados.
            </p>
          )}
        </ol>
      </section>

      <IncidenteComunicacion incidente={detalle} />
    </div>
  );
}
