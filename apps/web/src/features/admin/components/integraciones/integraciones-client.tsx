"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@safecampus/ui-kit";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Gauge,
  Info,
  Bot,
  Mail,
  MessageCircle,
  Map as MapIcon,
  Plug,
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
    label: "Sin verificar",
    icon: HelpCircle,
    className: "text-slate-400",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

type ServiceMeta = {
  label: string;
  descripcion: string;
  categoria: string;
  icon: React.ElementType;
  entorno?: "Desarrollo" | "Producción";
};

// Metadatos amigables por integración. La clave coincide con `servicio` en BD.
const SERVICE_META: Record<string, ServiceMeta> = {
  openai: {
    label: "OpenAI",
    descripcion: "Modelo de IA para clasificación de incidentes y asistencia conversacional.",
    categoria: "Inteligencia Artificial",
    icon: Bot,
  },
  gemini: {
    label: "Google Gemini",
    descripcion: "Modelo de IA usado en los módulos de Mensajes e Incidentes.",
    categoria: "Inteligencia Artificial",
    icon: Bot,
  },
  resend: {
    label: "Resend",
    descripcion: "Envío de correos y notificaciones por email a la comunidad.",
    categoria: "Notificaciones",
    icon: Mail,
  },
  whatsapp_evolution: {
    label: "WhatsApp · Evolution API",
    descripcion: "Pasarela de WhatsApp self-hosted (Docker) para el entorno de desarrollo.",
    categoria: "Mensajería",
    icon: MessageCircle,
    entorno: "Desarrollo",
  },
  whatsapp_meta: {
    label: "WhatsApp Business · Meta",
    descripcion: "WhatsApp Cloud API oficial de Meta para el entorno productivo.",
    categoria: "Mensajería",
    icon: MessageCircle,
    entorno: "Producción",
  },
  leaflet: {
    label: "Mapas · Leaflet",
    descripcion: "Mapas interactivos con tiles de OpenStreetMap.",
    categoria: "Mapas",
    icon: MapIcon,
  },
};

const CATEGORIA_ORDEN = [
  "Inteligencia Artificial",
  "Mensajería",
  "Notificaciones",
  "Mapas",
  "Otros",
];

function getMeta(servicio: string): ServiceMeta {
  return (
    SERVICE_META[servicio] ?? {
      label: servicio,
      descripcion: "Integración externa monitoreada por el sistema.",
      categoria: "Otros",
      icon: Plug,
    }
  );
}

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

function getDetalleMensaje(detalle: Record<string, unknown> | null): string | null {
  if (!detalle) return null;
  const mensaje = detalle["mensaje"];
  return typeof mensaje === "string" && mensaje.trim() ? mensaje : null;
}

export function IntegracionesClient({
  initialIntegraciones,
}: IntegracionesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [verificandoId, setVerificandoId] = useState<string | null>(null);

  const handleVerificar = (id: string) => {
    setVerificandoId(id);
    startTransition(async () => {
      await verificarIntegracion(id);
      setVerificandoId(null);
    });
  };

  const total = initialIntegraciones.length;
  const operativos = initialIntegraciones.filter((i) => i.estado === "OK").length;
  const degradados = initialIntegraciones.filter((i) => i.estado === "DEGRADADO").length;
  const caidos = initialIntegraciones.filter((i) => i.estado === "CAIDO").length;

  // Agrupar por categoría para un monitoreo rápido.
  const porCategoria = new Map<string, EstadoIntegracion[]>();
  for (const integracion of initialIntegraciones) {
    const cat = getMeta(integracion.servicio).categoria;
    const grupo = porCategoria.get(cat) ?? [];
    grupo.push(integracion);
    porCategoria.set(cat, grupo);
  }
  const categorias = [...porCategoria.keys()].sort(
    (a, b) => CATEGORIA_ORDEN.indexOf(a) - CATEGORIA_ORDEN.indexOf(b),
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Integraciones Externas
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitoreo del estado de los servicios externos conectados al sistema
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: total, icon: Plug, color: "text-slate-500" },
          { label: "Operativos", value: operativos, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Degradados", value: degradados, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Caídos", value: caidos, icon: XCircle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {total === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          <Plug className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">
            No hay integraciones configuradas. Los estados se registran
            automáticamente cuando el sistema las utiliza.
          </p>
        </div>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div className="space-y-8">
            {categorias.map((categoria) => (
              <section key={categoria} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-700">{categoria}</h2>
                  <Separator className="flex-1" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {porCategoria.get(categoria)!.map((integracion) => {
                    const estado = ESTADO_CONFIG[integracion.estado];
                    const meta = getMeta(integracion.servicio);
                    const StatusIcon = estado.icon;
                    const ServiceIcon = meta.icon;
                    const detalleMsg = getDetalleMensaje(integracion.detalle);
                    const cardPending = isPending && verificandoId === integracion.id;

                    return (
                      <Card key={integracion.id} className="border shadow-none">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                <ServiceIcon className="h-4 w-4" />
                              </span>
                              <div className="space-y-0.5">
                                <CardTitle className="text-sm leading-tight">
                                  {meta.label}
                                </CardTitle>
                                {meta.entorno && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-normal text-slate-500"
                                  >
                                    {meta.entorno}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <StatusIcon className={`h-5 w-5 shrink-0 ${estado.className}`} />
                          </div>
                          <CardDescription className="mt-2 text-xs leading-snug">
                            {meta.descripcion}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`text-xs ${estado.badgeClass}`}
                            >
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {estado.label}
                            </Badge>
                            {detalleMsg && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-slate-400" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[220px] text-xs">
                                  {detalleMsg}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(integracion.ultimo_check)}
                            </span>
                            {integracion.tiempo_respuesta_ms !== null && (
                              <span className="flex items-center gap-1.5">
                                <Gauge className="h-3 w-3" />
                                {integracion.tiempo_respuesta_ms} ms
                              </span>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={cardPending}
                            onClick={() => handleVerificar(integracion.id)}
                          >
                            <RefreshCw
                              className={`mr-2 h-3.5 w-3.5 ${cardPending ? "animate-spin" : ""}`}
                            />
                            {cardPending ? "Verificando…" : "Verificar ahora"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
