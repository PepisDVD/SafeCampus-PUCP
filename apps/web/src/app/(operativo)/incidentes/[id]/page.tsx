/**
 * apps/web/src/app/(operativo)/incidentes/[id]/page.tsx
 * Detalle operativo del expediente unico de incidente.
 *
 * Server Component: consume el backend FastAPI; no accede a BD directamente.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  FileText,
  Globe2,
  Info,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Tag,
  UserRound,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import type { UsuarioMini } from "@safecampus/shared-types";
import { Badge, cn } from "@safecampus/ui-kit";

import { IncidenteComunicacion } from "@/features/incidentes/components/incidente-comunicacion";
import {
  listarOperadores,
  obtenerDetalleIncidente,
} from "@/features/incidentes/service";
import {
  CANAL_LABEL,
  ESTADO_STYLE,
  SEVERIDAD_COLOR,
  SEVERIDAD_LABEL,
  formatCategoria,
  getInitials,
} from "@/features/incidentes/presentation";

import { IncidenteAccionesDialogs } from "./_components/incidente-acciones-dialogs";
import { IncidenteEvidencias } from "./_components/incidente-evidencias";
import { IncidenteExpedienteCierre } from "./_components/incidente-expediente-cierre";
import { IncidenteHistorial } from "./_components/incidente-historial";

function formatFechaLarga(iso: string | null | undefined): string {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleString("es-PE", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

function formatFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "--";
  }
}

function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SummaryFact({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="flex min-h-20 items-start gap-3 border-slate-200 p-4">
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          tone === "danger" ? "text-orange-600" : "text-slate-500",
        )}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-sm leading-snug font-semibold break-words text-slate-900",
            tone === "danger" && "text-orange-600",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function PanelRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof ShieldCheck;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4 border-b border-slate-200 px-1 py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Icon className="h-4 w-4 text-[#001C55]" />
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function MiniUser({
  usuario,
  emptyText,
}: {
  usuario: UsuarioMini | null;
  emptyText: string;
}) {
  if (!usuario) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      {usuario.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={usuario.avatar_url}
          alt={usuario.nombre_completo}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
          {getInitials(usuario.nombre_completo)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {usuario.nombre_completo}
        </p>
        {usuario.email && (
          <p className="truncate text-xs text-slate-500">{usuario.email}</p>
        )}
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
    <div className="mx-auto w-full max-w-[1540px] space-y-5 p-4 lg:p-6">
      <Link
        href="/incidentes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#001C55] hover:text-[#032E84]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Gestion de Casos
      </Link>

      <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <span
          aria-hidden
          className={cn("absolute top-0 bottom-0 left-0 w-1.5", severidadColor)}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0 pl-1">
            <p className="font-mono text-sm font-bold text-slate-500">
              {detalle.codigo}
            </p>
            <h1 className="mt-2 text-2xl leading-tight font-bold text-slate-900">
              {detalle.titulo}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "rounded-full border-0 px-3 py-1 text-xs font-semibold",
                  estadoStyle.className,
                )}
              >
                {estadoStyle.label}
              </Badge>
              <Chip>
                <span
                  aria-hidden
                  className={cn("h-2 w-2 rounded-full", severidadColor)}
                />
                {severidadLabel}
              </Chip>
              <Chip>
                <Tag className="h-3.5 w-3.5 text-slate-500" />
                {formatCategoria(detalle.categoria)}
              </Chip>
              <Chip>
                <Globe2 className="h-3.5 w-3.5 text-slate-500" />
                {CANAL_LABEL[detalle.canal_origen]}
              </Chip>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500">
              <CalendarClock className="h-4 w-4" />
              Reportado: {formatFechaLarga(detalle.created_at)}
            </p>
          </div>

          {detalle.estado !== "CERRADO" && (
            <IncidenteAccionesDialogs
              detalle={detalle}
              operadores={operadores}
              variant="header"
            />
          )}
        </div>
      </section>

      <IncidenteExpedienteCierre expediente={detalle.expediente_cierre ?? null} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_510px]">
        <main className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#001C55]" />
              <h2 className="text-base font-semibold text-slate-900">
                Resumen del incidente
              </h2>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <div className="border-b border-slate-200 p-4 md:border-r md:border-b-0">
                  <p className="text-xs font-medium text-slate-500">
                    Descripcion reportada
                  </p>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-800">
                    {detalle.descripcion ?? "No se agrego descripcion al reporte."}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2">
                  <SummaryFact
                    icon={MapPin}
                    label="Ubicacion"
                    value={detalle.lugar_referencia ?? "Sin ubicacion"}
                  />
                  <SummaryFact
                    icon={Tag}
                    label="Categoria"
                    value={formatCategoria(detalle.categoria)}
                  />
                  <SummaryFact
                    icon={AlertTriangle}
                    label="Severidad"
                    value={severidadLabel}
                    tone="danger"
                  />
                  <SummaryFact
                    icon={Globe2}
                    label="Canal de origen"
                    value={CANAL_LABEL[detalle.canal_origen]}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-[#001C55]" />
              <h2 className="text-base font-semibold text-slate-900">
                Historial del caso
              </h2>
            </div>
            <IncidenteHistorial historial={detalle.historial} />
          </section>

          <IncidenteComunicacion incidente={detalle} allowInternal />

          <div id="evidencias" className="scroll-mt-24">
            <IncidenteEvidencias evidencias={detalle.evidencias ?? []} />
          </div>
        </main>

        <aside className="space-y-5">
          <section
            id="panel-operativo"
            className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#001C55]" />
              <h2 className="text-base font-semibold text-slate-900">
                Panel operativo
              </h2>
            </div>

            <PanelRow icon={ShieldCheck} label="Estado actual">
              <Badge
                className={cn(
                  "rounded-full border-0 px-3 py-1 text-xs font-semibold",
                  estadoStyle.className,
                )}
              >
                {estadoStyle.label}
              </Badge>
            </PanelRow>
            <PanelRow icon={UserRound} label="Operador asignado">
              <MiniUser
                usuario={detalle.operador_asignado}
                emptyText="Sin asignar"
              />
              {!detalle.operador_asignado && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-orange-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Este incidente requiere asignacion.
                </p>
              )}
            </PanelRow>
            <PanelRow icon={ShieldCheck} label="Supervisor">
              <MiniUser usuario={detalle.supervisor} emptyText="Sin supervisor" />
            </PanelRow>
            <PanelRow icon={ShieldCheck} label="Reportante">
              <MiniUser usuario={detalle.reportante} emptyText="Sin reportante" />
            </PanelRow>

            {detalle.estado !== "CERRADO" && (
              <div className="border-b border-slate-200 py-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Zap className="h-4 w-4 text-[#001C55]" />
                  Acciones rapidas
                </div>
                <IncidenteAccionesDialogs
                  detalle={detalle}
                  operadores={operadores}
                  variant="quick"
                />
              </div>
            )}

            <div className="pt-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Info className="h-4 w-4 text-[#001C55]" />
                Metadatos del caso
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 text-sm">
                <div className="grid grid-cols-2 border-b border-slate-200">
                  <span className="bg-slate-50 px-3 py-2 font-medium text-slate-500">
                    Prioridad
                  </span>
                  <span className="px-3 py-2 font-semibold text-orange-600">
                    {severidadLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-200">
                  <span className="bg-slate-50 px-3 py-2 font-medium text-slate-500">
                    Creado
                  </span>
                  <span className="px-3 py-2 font-semibold text-slate-900">
                    {formatFechaCorta(detalle.created_at)}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="bg-slate-50 px-3 py-2 font-medium text-slate-500">
                    Ultima actualizacion
                  </span>
                  <span className="px-3 py-2 font-semibold text-slate-900">
                    {formatFechaLarga(detalle.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}
