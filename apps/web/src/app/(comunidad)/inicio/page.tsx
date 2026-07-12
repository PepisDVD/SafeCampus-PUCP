/**
 * 📁 apps/web/src/app/(comunidad)/inicio/page.tsx
 * 🎯 Pantalla de Inicio del PWA Comunidad — bienvenida, acciones rápidas, SOS,
 *    alertas de campus, reportes recientes y consejos de seguridad.
 * 📦 Módulo: Comunidad / Inicio
 *
 * Server Component: obtiene perfil de usuario y top reportes vía backend (API REST).
 * No accede a la BD directamente — toda la integración pasa por FastAPI.
 */

import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Clock,
  LifeBuoy,
  MapPin,
  Megaphone,
  PackageSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { EstadoIncidente, type IncidenteListItem } from "@safecampus/shared-types";
import { Badge, Card } from "@safecampus/ui-kit";

import { listarMisIncidentes } from "@/features/incidentes/service";
import { getCurrentUserProfile } from "@/lib/auth/server";
import { formatLimaDateTime } from "@/lib/lima-date";

const accionesRapidas = [
  {
    href: "/reportar",
    label: "Reportar Incidente",
    icon: ShieldAlert,
    iconBg: "bg-red-500",
  },
  {
    href: "/acompanamiento",
    label: "Acompañamiento Seguro",
    icon: LifeBuoy,
    iconBg: "bg-[#001C55]",
  },
  {
    href: "/lost-found",
    label: "Lost & Found",
    icon: PackageSearch,
    iconBg: "bg-amber-500",
  },
  {
    href: "/notificaciones",
    label: "Notificaciones",
    icon: Bell,
    iconBg: "bg-purple-500",
  },
];

function formatHora(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return formatLimaDateTime(iso, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }, "--");
  } catch {
    return "—";
  }
}

export default async function InicioPage() {
  const [perfil, reportesResult] = await Promise.all([
    getCurrentUserProfile(),
    listarMisIncidentes(2).catch(() => ({ items: [], total: 0 })),
  ]);

  const reportesRecientes: IncidenteListItem[] = reportesResult.items;
  const nombre = perfil?.nombre || "comunidad";

  return (
    <div className="space-y-6 px-4 py-5">
      {/* Welcome card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#001C55] to-[#032E84] p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-4 -bottom-10 h-28 w-28 rounded-full bg-white/5" />

        <p className="text-sm text-white/80">
          Bienvenida, <span className="font-medium text-white">{nombre}</span>{" "}
          <span aria-hidden>👋</span>
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight">
          ¿Qué necesitas hoy?
        </h2>

        <Link
          href="/notificaciones"
          className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm transition hover:bg-white/15"
        >
          <Bell className="h-4 w-4 text-amber-300" />
          <p className="flex-1 text-sm">Revisa tus notificaciones</p>
        </Link>
      </Card>

      {/* Acciones rápidas */}
      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Acciones rápidas
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {accionesRapidas.map((accion) => (
            <Link
              key={accion.href}
              href={accion.href}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accion.iconBg} text-white shadow-sm transition active:scale-95`}
              >
                <accion.icon className="h-6 w-6" />
              </div>
              <p className="text-[11px] leading-tight font-medium text-slate-700">
                {accion.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Botón SOS */}
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-4 text-left text-white shadow-md transition active:scale-[0.99] hover:from-red-700 hover:to-red-600"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Megaphone className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold">Botón de Emergencia SOS</p>
          <p className="text-xs text-white/85">
            Alerta inmediata al equipo de seguridad
          </p>
        </div>
      </button>

      {/* Alerta de campus */}
      <Card className="border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">Alerta de Campus</p>
              <Badge className="border-0 bg-amber-200 text-[10px] font-medium text-amber-900 hover:bg-amber-200">
                Activa
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Mayor vigilancia en <span className="font-semibold">Pabellón H</span> y zona de estacionamiento.
              Mantenga sus pertenencias seguras.
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              <span>Zona Ciencias · Zona Ingreso</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Mis reportes recientes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Mis reportes recientes
          </h3>
          <Link
            href="/mis-casos"
            className="flex items-center gap-0.5 text-xs font-medium text-[#001C55]"
          >
            Ver todos <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {reportesRecientes.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm text-slate-500">
              Aún no has registrado ningún reporte.
            </p>
            <Link
              href="/reportar"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#001C55]"
            >
              Crear mi primer reporte <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {reportesRecientes.map((reporte) => (
              <Card key={reporte.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500">
                      {reporte.codigo}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {reporte.titulo}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      <span>{reporte.lugar_referencia ?? "Sin ubicación"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {reporte.estado === EstadoIncidente.RESUELTO ||
                    reporte.estado === EstadoIncidente.CERRADO ? (
                      <Badge className="border-0 bg-emerald-100 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100">
                        <ShieldCheck className="mr-1 h-2.5 w-2.5" /> Resuelto
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-amber-100 text-[10px] font-medium text-amber-800 hover:bg-amber-100">
                        <Clock className="mr-1 h-2.5 w-2.5" /> En atención
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatHora(reporte.created_at)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Consejos de seguridad */}
      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Consejos de seguridad
        </h3>
        <Card className="border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#001C55]">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-bold text-slate-900">¿Sabías que?</p>
              <p className="text-sm leading-relaxed text-slate-700">
                Puedes usar el{" "}
                <span className="font-semibold text-[#001C55]">acompañamiento seguro</span>{" "}
                para que seguridad monitoree tu trayecto dentro del campus. Solo configura tu destino y actívalo.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
