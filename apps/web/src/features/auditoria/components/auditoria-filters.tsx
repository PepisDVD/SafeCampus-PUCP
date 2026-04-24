/**
 * 📁 apps/web/src/features/auditoria/components/auditoria-filters.tsx
 * 🎯 Filtros de búsqueda, tipo y rango de fechas para el log de auditoría.
 * 📦 Feature: Auditoría
 */

"use client";

import { Search } from "lucide-react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safecampus/ui-kit";

import type { AuditoriaFilters, TipoEventoAuditoria } from "../types";

interface Props {
  filtros: AuditoriaFilters;
  onChange: (next: AuditoriaFilters) => void;
}

const TIPO_LABELS: Record<TipoEventoAuditoria, string> = {
  usuario_creado: "Usuario creado",
  usuario_editado: "Usuario editado",
  usuario_suspendido: "Usuario suspendido",
  usuario_reactivado: "Usuario reactivado",
  rbac_modificado: "Matriz RBAC modificada",
  integracion_verificada: "Integración verificada",
  integracion_alerta: "Alerta de integración",
  otro: "Otro",
};

const TIPOS: TipoEventoAuditoria[] = [
  "usuario_creado",
  "usuario_editado",
  "usuario_suspendido",
  "usuario_reactivado",
  "rbac_modificado",
  "integracion_verificada",
  "integracion_alerta",
  "otro",
];

export function AuditoriaFiltersBar({ filtros, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="relative flex-1">
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Buscar
        </Label>
        <Search
          className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={filtros.busqueda}
          onChange={(e) => onChange({ ...filtros, busqueda: e.target.value })}
          placeholder="Buscar por actor, acción o detalle"
          className="pl-9"
          aria-label="Buscar eventos"
        />
      </div>
      <div className="w-full md:w-48">
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Tipo de evento
        </Label>
        <Select
          value={filtros.tipo}
          onValueChange={(v) =>
            onChange({ ...filtros, tipo: v as TipoEventoAuditoria | "todos" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full md:w-44">
        <Label
          htmlFor="auditoria-desde"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Desde
        </Label>
        <Input
          id="auditoria-desde"
          type="date"
          value={filtros.desde ?? ""}
          onChange={(e) => onChange({ ...filtros, desde: e.target.value || null })}
        />
      </div>
      <div className="w-full md:w-44">
        <Label
          htmlFor="auditoria-hasta"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Hasta
        </Label>
        <Input
          id="auditoria-hasta"
          type="date"
          value={filtros.hasta ?? ""}
          onChange={(e) => onChange({ ...filtros, hasta: e.target.value || null })}
        />
      </div>
    </div>
  );
}

export { TIPO_LABELS };
