/**
 * 📁 apps/web/src/features/integraciones/components/integracion-card.tsx
 * 🎯 Tarjeta individual de una integración con botón "Verificar ahora" (UC-GU-06).
 * 📦 Feature: Integraciones
 */

"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  MapPin,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@safecampus/ui-kit";

import type { CategoriaIntegracion, EstadoIntegracion, Integracion } from "../types";

const CATEGORIA_ICON: Record<
  CategoriaIntegracion,
  React.ComponentType<{ className?: string }>
> = {
  mensajeria: MessageSquare,
  ia: Sparkles,
  mapas: MapPin,
  correo: Mail,
  autenticacion: ShieldCheck,
};

const ESTADO_STYLE: Record<EstadoIntegracion, { label: string; badge: string; icon: React.ReactNode }> = {
  operativo: {
    label: "Operativo",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  },
  degradado: {
    label: "Degradado",
    badge: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  },
  inactivo: {
    label: "Inactivo",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="h-4 w-4 text-red-600" />,
  },
};

interface Props {
  integracion: Integracion;
  onVerify: (serviceName: string) => Promise<void>;
}

export function IntegracionCard({ integracion, onVerify }: Props) {
  const [verificando, setVerificando] = useState(false);
  const Icon = CATEGORIA_ICON[integracion.categoria];
  const estado = ESTADO_STYLE[integracion.estado];

  const onVerificar = async () => {
    setVerificando(true);
    try {
      await onVerify(integracion.id);
      toast.success(`Verificación completada: ${integracion.nombre}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar la integración.");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{integracion.nombre}</CardTitle>
            <CardDescription className="mt-1">{integracion.descripcion}</CardDescription>
          </div>
        </div>
        <Badge className={`${estado.badge} shrink-0 border-transparent`}>
          <span className="mr-1">{estado.icon}</span>
          {estado.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Última verificación</span>
          <span className="font-mono text-xs text-slate-600">
            {integracion.ultimaVerificacion}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Latencia</span>
          <span className="font-mono text-xs text-slate-600">
            {integracion.latenciaMs ? `${integracion.latenciaMs} ms` : "—"}
          </span>
        </div>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {integracion.mensajeEstado}
        </p>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={onVerificar}
          disabled={verificando}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${verificando ? "animate-spin" : ""}`} />
          {verificando ? "Verificando..." : "Verificar ahora"}
        </Button>
      </CardFooter>
    </Card>
  );
}
