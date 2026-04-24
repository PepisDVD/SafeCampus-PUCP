/**
 * 📁 apps/web/src/features/integraciones/components/integraciones-panel.tsx
 * 🎯 Panel de monitoreo de servicios externos (UC-GU-06).
 *    Muestra resumen global + grilla de tarjetas con acciones "Verificar ahora".
 * 📦 Feature: Integraciones
 */

"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent } from "@safecampus/ui-kit";

import { useAdminPanel } from "@/features/admin-panel";

import { IntegracionCard } from "./integracion-card";

export function IntegracionesPanel() {
  const { integraciones } = useAdminPanel();

  const operativos = integraciones.filter((i) => i.estado === "operativo").length;
  const degradados = integraciones.filter((i) => i.estado === "degradado").length;
  const inactivos = integraciones.filter((i) => i.estado === "inactivo").length;

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integraciones.map((i) => (
          <IntegracionCard key={i.id} integracion={i} />
        ))}
      </div>
    </div>
  );
}
