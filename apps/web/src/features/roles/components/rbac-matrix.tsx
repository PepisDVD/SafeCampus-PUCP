/**
 * 📁 apps/web/src/features/roles/components/rbac-matrix.tsx
 * 🎯 Matriz RBAC editable (UC-GU-05) — cruza módulos × roles.
 *    Cada celda muestra un Select con los 4 niveles: sí / no / parcial / consulta.
 *    Valida invariante: el admin no puede perder acceso a Gestión de usuarios.
 * 📦 Feature: Roles y permisos
 */

"use client";

import { toast } from "sonner";

import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";

import {
  NIVEL_BADGE_CLASS,
  NIVEL_LABEL,
  type GrupoFuncional,
  type NivelPermiso,
} from "@/constants/permissions";
import {
  ROL_BADGE_CLASS,
  ROL_DESCRIPCIONES,
  ROL_LABELS,
  ROLES,
  type RolUsuario,
} from "@/constants/roles";
import { useAdminPanel } from "@/features/admin-panel";

const NIVELES: NivelPermiso[] = ["si", "no", "parcial", "consulta"];

export function RbacMatrix() {
  const { rbac, ajustarPermiso } = useAdminPanel();

  const onChange = (grupo: GrupoFuncional, rol: RolUsuario, nivel: NivelPermiso) => {
    const result = ajustarPermiso(grupo, rol, nivel);
    if (!result.ok) {
      toast.error(result.mensaje ?? "No se pudo ajustar el permiso.");
      return;
    }
    toast.success(
      `Permiso actualizado: ${ROL_LABELS[rol]} → ${NIVEL_LABEL[nivel]}.`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((rol) => (
          <div
            key={rol}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <Badge className={`${ROL_BADGE_CLASS[rol]} border-transparent`}>
              {ROL_LABELS[rol]}
            </Badge>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {ROL_DESCRIPCIONES[rol]}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[30%]">Módulo</TableHead>
              {ROLES.map((rol) => (
                <TableHead key={rol} className="text-center">
                  {ROL_LABELS[rol]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rbac.map((entry) => (
              <TableRow key={entry.grupo}>
                <TableCell className="font-medium text-slate-800">
                  {entry.modulo}
                </TableCell>
                {ROLES.map((rol) => {
                  const nivel = entry.permisos[rol];
                  return (
                    <TableCell key={`${entry.grupo}-${rol}`} className="text-center">
                      <Select
                        value={nivel}
                        onValueChange={(v) => onChange(entry.grupo, rol, v as NivelPermiso)}
                      >
                        <SelectTrigger
                          className="mx-auto w-28 justify-between"
                          aria-label={`Permiso ${ROL_LABELS[rol]} / ${entry.modulo}`}
                        >
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${NIVEL_BADGE_CLASS[nivel]}`}
                          >
                            {NIVEL_LABEL[nivel]}
                          </span>
                          <SelectValue className="sr-only" />
                        </SelectTrigger>
                        <SelectContent>
                          {NIVELES.map((n) => (
                            <SelectItem key={n} value={n}>
                              {NIVEL_LABEL[n]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
