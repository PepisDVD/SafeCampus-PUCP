/**
 * 📁 apps/web/src/features/usuarios/components/usuario-filters.tsx
 * 🎯 Filtros de búsqueda y selección por rol/estado para la tabla de usuarios.
 * 📦 Feature: Usuarios
 */

"use client";

import { Search } from "lucide-react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safecampus/ui-kit";

import { ESTADO_LABELS, ESTADOS, ROL_LABELS, ROLES } from "@/constants/roles";
import type { EstadoUsuario, RolUsuario } from "@/constants/roles";

import type { UsuarioFilters } from "../types";

interface Props {
  filtros: UsuarioFilters;
  onChange: (next: UsuarioFilters) => void;
}

export function UsuarioFiltersBar({ filtros, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={filtros.busqueda}
          onChange={(e) => onChange({ ...filtros, busqueda: e.target.value })}
          placeholder="Buscar por nombre, correo, código o departamento"
          className="pl-9"
          aria-label="Buscar usuarios"
        />
      </div>
      <Select
        value={filtros.rol}
        onValueChange={(value) =>
          onChange({ ...filtros, rol: value as RolUsuario | "todos" })
        }
      >
        <SelectTrigger className="w-full md:w-44" aria-label="Filtrar por rol">
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los roles</SelectItem>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROL_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filtros.estado}
        onValueChange={(value) =>
          onChange({ ...filtros, estado: value as EstadoUsuario | "todos" })
        }
      >
        <SelectTrigger className="w-full md:w-44" aria-label="Filtrar por estado">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados</SelectItem>
          {ESTADOS.map((e) => (
            <SelectItem key={e} value={e}>
              {ESTADO_LABELS[e]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
