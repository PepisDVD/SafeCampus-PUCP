"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Badge,
  Checkbox,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@safecampus/ui-kit";
import { Save, Shield, Info } from "lucide-react";
import { actualizarPermisosRol } from "../../actions/rol.actions";
import type { RolConPermisos, Permiso } from "../../services/rol.service";

type RbacMatrixClientProps = {
  roles: RolConPermisos[];
  permisos: Permiso[];
};

type MatrixState = Record<string, Set<string>>; // rolId -> Set<permisoId>

function buildInitialState(roles: RolConPermisos[]): MatrixState {
  const state: MatrixState = {};
  for (const rol of roles) {
    state[rol.id] = new Set(rol.permisos.map((p) => p.id));
  }
  return state;
}

function agruparPermisosPorModulo(
  permisos: Permiso[],
): Record<string, Permiso[]> {
  return permisos.reduce(
    (acc, p) => {
      (acc[p.modulo] ??= []).push(p);
      return acc;
    },
    {} as Record<string, Permiso[]>,
  );
}

export function RbacMatrixClient({ roles, permisos }: RbacMatrixClientProps) {
  const [matrix, setMatrix] = useState<MatrixState>(() =>
    buildInitialState(roles),
  );
  const [isPending, startTransition] = useTransition();
  const [savedRolId, setSavedRolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupedPermisos = agruparPermisosPorModulo(permisos);
  const modulos = Object.keys(groupedPermisos).sort();

  const toggle = (rolId: string, permisoId: string) => {
    setMatrix((prev) => {
      const current = new Set(prev[rolId] ?? []);
      if (current.has(permisoId)) {
        current.delete(permisoId);
      } else {
        current.add(permisoId);
      }
      return { ...prev, [rolId]: current };
    });
  };

  const handleSave = (rolId: string) => {
    setError(null);
    startTransition(async () => {
      const permisoIds = Array.from(matrix[rolId] ?? []);
      const result = await actualizarPermisosRol(rolId, permisoIds);
      if (result.error) {
        setError(result.error);
      } else {
        setSavedRolId(rolId);
        setTimeout(() => setSavedRolId(null), 2000);
      }
    });
  };

  if (permisos.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          <Shield className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">
            No hay permisos configurados en el sistema todavía.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Roles y Permisos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configura qué acciones puede realizar cada rol en cada módulo
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Roles summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {roles.map((rol) => (
            <div
              key={rol.id}
              className="rounded-lg border bg-white p-4 space-y-1"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#001C55]" />
                <p className="font-medium text-sm truncate">{rol.nombre}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {matrix[rol.id]?.size ?? 0} permisos
              </p>
              {rol.es_sistema && (
                <Badge variant="secondary" className="text-xs">
                  Sistema
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Matrix per rol */}
        {roles.map((rol) => (
          <div key={rol.id} className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#001C55]" />
                <h2 className="font-semibold text-sm">{rol.nombre}</h2>
                {rol.descripcion && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{rol.descripcion}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => handleSave(rol.id)}
                disabled={isPending}
                className={
                  savedRolId === rol.id
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-[#001C55] hover:bg-[#001C55]/90"
                }
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {savedRolId === rol.id
                  ? "Guardado"
                  : isPending
                    ? "Guardando..."
                    : "Guardar"}
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {modulos.map((modulo) => {
                const permisosModulo = groupedPermisos[modulo] ?? [];
                const allChecked = permisosModulo.every((p) =>
                  matrix[rol.id]?.has(p.id),
                );
                const someChecked = permisosModulo.some((p) =>
                  matrix[rol.id]?.has(p.id),
                );

                return (
                  <div key={modulo}>
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        id={`${rol.id}-${modulo}-all`}
                        checked={allChecked}
                        data-state={
                          allChecked
                            ? "checked"
                            : someChecked
                              ? "indeterminate"
                              : "unchecked"
                        }
                        onCheckedChange={(checked) => {
                          setMatrix((prev) => {
                            const current = new Set(prev[rol.id] ?? []);
                            permisosModulo.forEach((p) => {
                              if (checked) {
                                current.add(p.id);
                              } else {
                                current.delete(p.id);
                              }
                            });
                            return { ...prev, [rol.id]: current };
                          });
                        }}
                      />
                      <label
                        htmlFor={`${rol.id}-${modulo}-all`}
                        className="text-sm font-medium capitalize cursor-pointer"
                      >
                        {modulo.replace(/_/g, " ")}
                      </label>
                    </div>
                    <div className="ml-6 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {permisosModulo.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={matrix[rol.id]?.has(p.id) ?? false}
                            onCheckedChange={() => toggle(rol.id, p.id)}
                          />
                          <span className="capitalize">
                            {p.accion.replace(/_/g, " ")}
                          </span>
                          {p.descripcion && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="max-w-48">{p.descripcion}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
