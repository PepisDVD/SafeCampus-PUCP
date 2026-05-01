"use client";

import { useTransition } from "react";
import { Badge, Button, Card, CardContent } from "@safecampus/ui-kit";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Zap,
} from "lucide-react";
import { verificarIntegracion } from "../../actions/rol.actions";
import type { EstadoIntegracion, EstadoServicio } from "../../services/integracion.service";

type IntegracionesClientProps = {
  initialIntegraciones: EstadoIntegracion[];
};

const ESTADO_CONFIG: Record<
  EstadoServicio,
  { label: string; icon: React.ElementType; className: string; badgeClass: string }
> = {
  OK: {
    label: "Operativo",
    icon: CheckCircle2,
    className: "text-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DEGRADADO: {
    label: "Degradado",
    icon: AlertTriangle,
    className: "text-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CAIDO: {
    label: "Caído",
    icon: XCircle,
    className: "text-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  DESCONOCIDO: {
    label: "Desconocido",
    icon: HelpCircle,
    className: "text-slate-400",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

const SERVICE_LABELS: Record<string, string> = {
  openai: "OpenAI API",
  whatsapp: "WhatsApp Business",
  google_maps: "Google Maps",
  gmail: "Gmail OAuth2",
  supabase: "Supabase DB",
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Sin verificar";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  return `Hace ${Math.floor(hrs / 24)} d`;
}

export function IntegracionesClient({
  initialIntegraciones,
}: IntegracionesClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleVerificar = (id: string) => {
    startTransition(async () => {
      await verificarIntegracion(id);
    });
  };

  if (initialIntegraciones.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            Integraciones Externas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoreo de servicios externos conectados al sistema
          </p>
        </div>
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          <Zap className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">
            No hay integraciones configuradas. Los estados se registran
            automáticamente cuando el sistema las utiliza.
          </p>
        </div>
      </div>
    );
  }

  const total = initialIntegraciones.length;
  const operativos = initialIntegraciones.filter((i) => i.estado === "OK").length;
  const degradados = initialIntegraciones.filter(
    (i) => i.estado === "DEGRADADO",
  ).length;
  const caidos = initialIntegraciones.filter((i) => i.estado === "CAIDO").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Integraciones Externas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoreo de servicios externos conectados al sistema
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Operativos",
            value: operativos,
            icon: CheckCircle2,
            color: "text-emerald-500",
          },
          {
            label: "Degradados",
            value: degradados,
            icon: AlertTriangle,
            color: "text-amber-500",
          },
          {
            label: "Caídos",
            value: caidos,
            icon: XCircle,
            color: "text-red-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">
                  {label} de {total}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialIntegraciones.map((integracion) => {
          const config = ESTADO_CONFIG[integracion.estado];
          const StatusIcon = config.icon;
          const displayName =
            SERVICE_LABELS[integracion.servicio] ?? integracion.servicio;

          return (
            <Card key={integracion.id} className="border shadow-none">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{displayName}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${config.badgeClass}`}
                    >
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <StatusIcon className={`h-6 w-6 ${config.className}`} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(integracion.ultimo_check)}</span>
                  </div>
                  {integracion.tiempo_respuesta_ms !== null && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3" />
                      <span>{integracion.tiempo_respuesta_ms} ms</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => handleVerificar(integracion.id)}
                >
                  <RefreshCw
                    className={`mr-2 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
                  />
                  Verificar ahora
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
