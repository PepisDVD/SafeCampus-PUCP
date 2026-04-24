/**
 * 📁 apps/web/src/features/usuarios/components/usuarios-panel.tsx
 * 🎯 Ensamble del panel completo de Gestión de Usuarios (UC-GU-02..04).
 *    Compone stats + filtros + tabla + diálogos de alta/edición/suspensión.
 * 📦 Feature: Usuarios
 */

"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@safecampus/ui-kit";

import { useUsuarios } from "../hooks/use-usuarios";
import type { UsuarioAdmin } from "../types";

import { UsuarioFiltersBar } from "./usuario-filters";
import { UsuarioFormDialog } from "./usuario-form-dialog";
import { UsuarioStatsCards } from "./usuario-stats-cards";
import { UsuarioSuspenderDialog } from "./usuario-suspender-dialog";
import { UsuarioTable } from "./usuario-table";

export function UsuariosPanel() {
  const {
    usuariosFiltrados,
    stats,
    filtros,
    loading,
    error,
    setFiltros,
    crearUsuario,
    editarUsuario,
    suspenderUsuario,
    reactivarUsuario,
  } = useUsuarios();

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const [suspenderAbierto, setSuspenderAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioAdmin | null>(null);

  const abrirEditar = (u: UsuarioAdmin) => {
    setUsuarioSeleccionado(u);
    setEditarAbierto(true);
  };
  const abrirSuspender = (u: UsuarioAdmin) => {
    setUsuarioSeleccionado(u);
    setSuspenderAbierto(true);
  };
  const reactivar = async (u: UsuarioAdmin) => {
    await reactivarUsuario(u.id);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <UsuarioStatsCards stats={stats} />

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <UsuarioFiltersBar filtros={filtros} onChange={setFiltros} />
        </div>
        <Button onClick={() => setCrearAbierto(true)} className="sm:ml-3">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <UsuarioTable
        loading={loading}
        usuarios={usuariosFiltrados}
        onEdit={abrirEditar}
        onSuspend={abrirSuspender}
        onReactivate={reactivar}
      />

      <UsuarioFormDialog
        open={crearAbierto}
        onOpenChange={setCrearAbierto}
        modo="crear"
        onCrear={crearUsuario}
      />
      <UsuarioFormDialog
        open={editarAbierto}
        onOpenChange={setEditarAbierto}
        modo="editar"
        usuario={usuarioSeleccionado ?? undefined}
        onEditar={editarUsuario}
      />
      <UsuarioSuspenderDialog
        open={suspenderAbierto}
        onOpenChange={setSuspenderAbierto}
        usuario={usuarioSeleccionado}
        onConfirm={(id) => suspenderUsuario(id)}
      />
    </div>
  );
}
