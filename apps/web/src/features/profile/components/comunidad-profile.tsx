/**
 * 📁 apps/web/src/features/profile/components/comunidad-profile.tsx
 * 🎯 Vista de perfil del PWA Comunidad — layout mobile con resumen, info personal,
 *    notificaciones y preferencias.
 * 📦 Feature: Profile (variante Comunidad)
 *
 * Datos reales (vía backend): identidad, contacto, rol y stats de reportes.
 * Notificaciones y preferencias: placeholders visuales — todavía no hay
 * endpoints en el backend para esos módulos.
 */

import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Hash,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { Badge, Card } from "@safecampus/ui-kit";

type ComunidadProfileProps = {
  perfil: {
    nombre: string;
    apellido: string;
    email: string;
    codigoInstitucional: string | null;
    telefono: string | null;
    departamento: string | null;
    roles: string[];
  };
  stats: {
    total: number;
    activos: number;
    resueltos: number;
  };
};

const ROLE_LABELS: Record<string, string> = {
  comunidad: "Usuario comunidad",
  estudiante: "Estudiante",
  operador: "Operador",
  supervisor: "Supervisor",
  administrador: "Administrador",
};

function formatRole(role: string | undefined): string {
  if (!role) return "Usuario comunidad";
  return ROLE_LABELS[role.toLowerCase()] ?? role;
}

function getInitials(nombre: string, apellido: string): string {
  const ini = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  return ini || "SC";
}

// --- mock visual: notificaciones y preferencias --------------------------
// TODO: cuando exista el backend de sc_notificaciones, reemplazar por fetch real.
const notificacionesMock = [
  {
    id: "n1",
    icon: CheckCircle2,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    titulo: "Tu reporte fue recibido",
    descripcion: "El incidente INC-2026-0342 fue registrado exitosamente.",
    cuando: "hace 15 min",
    leida: false,
  },
  {
    id: "n2",
    icon: CircleAlert,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    titulo: "Actualización de estado",
    descripcion: "Tu caso INC-2026-0342 está siendo atendido por un operador.",
    cuando: "hace 10 min",
    leida: false,
  },
  {
    id: "n3",
    icon: CircleAlert,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    titulo: "Lost & Found - Coincidencia",
    descripcion: "Se encontró un objeto que coincide con tu reporte LF-001.",
    cuando: "hace 2 horas",
    leida: true,
  },
  {
    id: "n4",
    icon: AlertCircle,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    titulo: "Alerta de seguridad en campus",
    descripcion: "Zona Ciencias: Mantenga precaución en el área del Pabellón H.",
    cuando: "ayer",
    leida: true,
  },
];

const preferenciasMock = [
  { id: "push", icon: Bell, label: "Notificaciones push", value: "Activadas" },
  { id: "privacidad", icon: ShieldCheck, label: "Privacidad y datos", value: null },
  { id: "editar", icon: UserCircle2, label: "Editar perfil", value: null },
];

export function ComunidadProfile({ perfil, stats }: ComunidadProfileProps) {
  const fullName = `${perfil.nombre} ${perfil.apellido}`.trim() || perfil.email;
  const initials = getInitials(perfil.nombre, perfil.apellido);
  const rolPrincipal = formatRole(perfil.roles[0]);
  const facultad = perfil.departamento ?? "Sin facultad registrada";
  const noLeidas = notificacionesMock.filter((n) => !n.leida).length;

  return (
    <div className="space-y-6 px-4 py-5">
      {/* Header card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#001C55] to-[#032E84] p-5 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{fullName}</h1>
            <p className="text-sm text-white/80">
              {rolPrincipal}
              {perfil.departamento ? ` · ${perfil.departamento}` : ""}
            </p>
            <p className="truncate text-xs text-white/70">{perfil.email}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center">
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-white/75">Reportes</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.activos}</p>
            <p className="text-xs text-white/75">Activos</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.resueltos}</p>
            <p className="text-xs text-white/75">Resueltos</p>
          </div>
        </div>
      </Card>

      {/* Información personal */}
      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Información personal
        </h3>
        <Card className="divide-y divide-slate-100 p-0">
          <InfoRow
            icon={Hash}
            label="Código"
            value={perfil.codigoInstitucional ?? "No registrado"}
          />
          <InfoRow icon={Building2} label="Facultad" value={facultad} />
          <InfoRow icon={Mail} label="Correo" value={perfil.email} />
          <InfoRow
            icon={Phone}
            label="Teléfono"
            value={perfil.telefono ?? "No registrado"}
          />
          <InfoRow
            icon={ShieldCheck}
            label="Rol en sistema"
            value={rolPrincipal}
          />
        </Card>
      </section>

      {/* Notificaciones */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Notificaciones
          </h3>
          {noLeidas > 0 && (
            <Badge className="border-0 bg-red-500 text-[10px] font-semibold text-white hover:bg-red-500">
              {noLeidas} {noLeidas === 1 ? "nueva" : "nuevas"}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {notificacionesMock.map((noti) => (
            <Card key={noti.id} className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${noti.iconBg}`}
                >
                  <noti.icon className={`h-4 w-4 ${noti.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {noti.titulo}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {noti.descripcion}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">{noti.cuando}</p>
                </div>
                {!noti.leida && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
                    aria-label="No leída"
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Preferencias */}
      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Preferencias
        </h3>
        <Card className="divide-y divide-slate-100 p-0">
          {preferenciasMock.map((pref) => (
            <button
              key={pref.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <pref.icon className="h-4 w-4 text-slate-600" />
              </div>
              <p className="flex-1 text-sm font-semibold text-slate-900">
                {pref.label}
              </p>
              {pref.value && (
                <span className="text-xs font-medium text-slate-500">
                  {pref.value}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </Card>
      </section>
    </div>
  );
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
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}