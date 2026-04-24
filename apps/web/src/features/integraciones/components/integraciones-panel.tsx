/**
 * 📁 apps/web/src/features/integraciones/components/integraciones-panel.tsx
 * 🎯 Panel de monitoreo de servicios externos (UC-GU-06).
 *    Muestra resumen global + grilla de tarjetas con acciones "Verificar ahora".
 * 📦 Feature: Integraciones
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@safecampus/ui-kit";

import { adminApi, type AdminIntegrationApi } from "@/lib/api/admin";

import { IntegracionCard } from "./integracion-card";
import type { CategoriaIntegracion, EstadoIntegracion, Integracion } from "../types";

function normalizeIntegracion(item: AdminIntegrationApi): Integracion {
  const allowedCategorias: CategoriaIntegracion[] = [
    "mensajeria",
    "ia",
    "mapas",
    "correo",
    "autenticacion",
  ];
  const allowedEstados: EstadoIntegracion[] = ["operativo", "degradado", "inactivo"];

  const categoria = allowedCategorias.includes(item.categoria as CategoriaIntegracion)
    ? (item.categoria as CategoriaIntegracion)
    : "autenticacion";
  const estado = allowedEstados.includes(item.estado as EstadoIntegracion)
    ? (item.estado as EstadoIntegracion)
    : "inactivo";

  return {
    id: item.servicio,
    nombre: item.nombre,
    descripcion: item.descripcion,
    categoria,
    estado,
    ultimaVerificacion: item.ultima_verificacion
      ? new Date(item.ultima_verificacion).toLocaleString("es-PE")
      : "Sin verificación",
    latenciaMs: item.latencia_ms,
    mensajeEstado: item.mensaje_estado,
  };
}

export function IntegracionesPanel() {
  const [integraciones, setIntegraciones] = useState<Integracion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void adminApi
      .listIntegrations()
      .then((response) => {
        if (!mounted) return;
        setIntegraciones(response.items.map(normalizeIntegracion));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar las integraciones.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const onVerify = async (serviceName: string) => {
    const response = await adminApi.verifyIntegration(serviceName);
    setIntegraciones((prev) =>
      prev.map((item) => (item.id === serviceName ? normalizeIntegracion(response.item) : item)),
    );
  };

  const operativos = useMemo(
    () => integraciones.filter((i) => i.estado === "operativo").length,
    [integraciones],
  );
  const degradados = useMemo(
    () => integraciones.filter((i) => i.estado === "degradado").length,
    [integraciones],
  );
  const inactivos = useMemo(
    () => integraciones.filter((i) => i.estado === "inactivo").length,
    [integraciones],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-700/80">
                Operativos
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-800">
                {operativos}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-700/80">
                Degradados
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-800">
                {degradados}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-red-700/80">
                Inactivos
              </p>
              <p className="mt-1 text-2xl font-semibold text-red-800">{inactivos}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-muted-foreground">
          Cargando integraciones...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integraciones.map((i) => (
            <IntegracionCard key={i.id} integracion={i} onVerify={onVerify} />
          ))}
        </div>
      )}
    </div>
  );
}
