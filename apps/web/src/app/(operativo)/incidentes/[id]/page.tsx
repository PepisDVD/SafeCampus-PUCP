/**
 * 📁 apps/web/src/app/(operativo)/incidentes/[id]/page.tsx
 * 🎯 Detalle del expediente único: cabecera, descripción, info, asignación e historial.
 * 📦 Módulo: Operativo / Incidentes / Detalle
 *
 * Server Component: fetch del detalle vía backend (FastAPI → sc_incidentes.incidente).
 * No accede a la BD directamente.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hash,
  MapPin,
  Radio,
  Tag,
} from "lucide-react";
import { Badge, cn } from "@safecampus/ui-kit";

import {
  listarOperadores,
  obtenerDetalleIncidente,
} from "@/features/incidentes/service";
import { IncidenteComunicacion } from "@/features/incidentes/components/incidente-comunicacion";
import {
  CANAL_LABEL,
  ESTADO_STYLE,
  SEVERIDAD_COLOR,
  SEVERIDAD_LABEL,
  formatCategoria,
} from "@/features/incidentes/presentation";

import { IncidenteAcciones } from "./_components/incidente-acciones";
import { IncidenteEvidencias } from "./_components/incidente-evidencias";
import { IncidenteExpedienteCierre } from "./_components/incidente-expediente-cierre";
import { IncidenteHistorial } from "./_components/incidente-historial";
import { UsuarioCard } from "./_components/usuario-card";

function formatFechaLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-PE", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default async function IncidenteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detalle;
  try {
    detalle = await obtenerDetalleIncidente(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("404") || /no encontrado/i.test(message)) {
      notFound();
    }
    throw error;
  }

  const operadores = await listarOperadores().catch(() => []);

  const estadoStyle = ESTADO_STYLE[detalle.estado];
  const severidadColor = detalle.severidad
    ? SEVERIDAD_COLOR[detalle.severidad]
    : "bg-slate-300";
  const severidadLabel = detalle.severidad
    ? SEVERIDAD_LABEL[detalle.severidad]
    : "Sin severidad";

  return (
    <div className="w-full space-y-5 p-6">
      {/* Back */}
      <Link
        href="/incidentes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#001C55]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Gestión de Casos
      </Link>

      {/* Header card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
        <span
          aria-hidden
          className={cn(
            "absolute top-0 bottom-0 left-0 w-1.5",
            severidadColor,
          )}
        />

        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-500">
                {detalle.codigo}
              </span>
              <Badge
                className={cn(
                  "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
                  estadoStyle.className,
                )}
              >
                {estadoStyle.label}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                <span
                  aria-hidden
                  className={cn("h-2 w-2 rounded-full", severidadColor)}
                />
                {severidadLabel}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {detalle.titulo}
            </h1>
          </div>
        </div>
      </div>

      <IncidenteExpedienteCierre expediente={detalle.expediente_cierre ?? null} />

      {/* Two-column grid */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left: descripción + historial */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Descripción
            </h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-slate-700">
              {detalle.descripcion}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Historial
            </h2>
            <IncidenteHistorial historial={detalle.historial} />
          </section>

          <IncidenteComunicacion incidente={detalle} allowInternal />
        </div>

        {/* Right: actions + info + people */}
        <aside className="space-y-5 xl:sticky xl:top-20">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Información
            </h2>
            <div className="space-y-4">
              <InfoRow
                icon={Tag}
                label="Categoría"
                value={formatCategoria(detalle.categoria)}
              />
              <InfoRow
                icon={MapPin}
                label="Ubicación"
                value={detalle.lugar_referencia ?? "Sin ubicación"}
              />
              <InfoRow
                icon={Radio}
                label="Canal de origen"
                value={CANAL_LABEL[detalle.canal_origen]}
              />
              <InfoRow
                icon={CalendarClock}
                label="Reportado el"
                value={formatFechaLarga(detalle.created_at)}
              />
              {detalle.fecha_primera_respuesta && (
                <InfoRow
                  icon={Clock}
                  label="Primera respuesta"
                  value={formatFechaLarga(detalle.fecha_primera_respuesta)}
                />
              )}
              {detalle.fecha_resolucion && (
                <InfoRow
                  icon={CheckCircle2}
                  label="Resuelto el"
                  value={formatFechaLarga(detalle.fecha_resolucion)}
                />
              )}
            </div>
          </section>

          <IncidenteEvidencias evidencias={detalle.evidencias ?? []} />

          <UsuarioCard label="Reportante" usuario={detalle.reportante} />
          <UsuarioCard
            label="Operador asignado"
            usuario={detalle.operador_asignado}
            emptyText="Sin asignar"
          />
          <UsuarioCard
            label="Supervisor"
            usuario={detalle.supervisor}
            emptyText="Sin supervisor"
          />

          {detalle.estado !== "CERRADO" && (
            <IncidenteAcciones detalle={detalle} operadores={operadores} />
          )}
        </aside>
      </div>
    </div>
  );
}
