/**
 * 📁 apps/web/src/features/usuarios/components/usuario-table.tsx
 * 🎯 Tabla de usuarios con avatar, rol, estado y acciones rápidas.
 *    Respeta los colores y badges definidos por la matriz RBAC v1.0.
 * 📦 Feature: Usuarios
 */

"use client";

import { MoreHorizontal, Pencil, ShieldOff, UserCheck } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";

import {
  ESTADO_BADGE_CLASS,
  ESTADO_LABELS,
  ROL_AVATAR_CLASS,
  ROL_BADGE_CLASS,
  ROL_LABELS,
} from "@/constants/roles";

import type { UsuarioAdmin } from "../types";

interface Props {
  loading?: boolean;
  usuarios: UsuarioAdmin[];
  onEdit: (u: UsuarioAdmin) => void;
  onSuspend: (u: UsuarioAdmin) => void;
  onReactivate: (u: UsuarioAdmin) => Promise<void>;
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UsuarioTable({ loading, usuarios, onEdit, onSuspend, onReactivate }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-muted-foreground">
        Cargando usuarios...
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No hay usuarios que coincidan con los filtros actuales.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Último acceso</TableHead>
            <TableHead className="w-16 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${ROL_AVATAR_CLASS[u.rol]}`}
                    aria-hidden
                  >
                    {iniciales(u.nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{u.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-600">{u.codigo}</TableCell>
              <TableCell className="text-sm text-slate-700">{u.departamento}</TableCell>
              <TableCell>
                <Badge className={`${ROL_BADGE_CLASS[u.rol]} border-transparent`}>
                  {ROL_LABELS[u.rol]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${ESTADO_BADGE_CLASS[u.estado]} border-transparent`}>
                  {ESTADO_LABELS[u.estado]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {u.ultimoAcceso ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label={`Acciones sobre ${u.nombre}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(u)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {u.estado === "suspendido" || u.estado === "inactivo" ? (
                      <DropdownMenuItem onClick={() => onReactivate(u)}>
                        <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                        Reactivar cuenta
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onSuspend(u)}
                        className="text-red-600 focus:text-red-700"
                      >
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Suspender cuenta
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
