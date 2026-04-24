/**
 * 📁 apps/web/src/features/usuarios/hooks/use-usuarios.ts
 * 🎯 Hook de lectura + derivados para el módulo de usuarios.
 *    Encapsula filtrado por búsqueda, rol y estado, y estadísticas agregadas.
 * 📦 Feature: Usuarios
 */

"use client";

import { useMemo, useState } from "react";

import { useAdminPanel } from "@/features/admin-panel";

import type { UsuarioAdmin, UsuarioFilters, UsuarioStats } from "../types";

const FILTROS_INICIALES: UsuarioFilters = {
  busqueda: "",
  rol: "todos",
  estado: "todos",
};

function coincide(usuario: UsuarioAdmin, filtros: UsuarioFilters): boolean {
  const term = filtros.busqueda.trim().toLowerCase();
  if (term) {
    const enCampos = [usuario.nombre, usuario.email, usuario.codigo, usuario.departamento]
      .join(" ")
      .toLowerCase();
    if (!enCampos.includes(term)) return false;
  }
  if (filtros.rol !== "todos" && usuario.rol !== filtros.rol) return false;
  if (filtros.estado !== "todos" && usuario.estado !== filtros.estado) return false;
  return true;
}

export function useUsuarios() {
  const admin = useAdminPanel();
  const [filtros, setFiltros] = useState<UsuarioFilters>(FILTROS_INICIALES);

  const usuariosFiltrados = useMemo(
    () => admin.usuarios.filter((u) => coincide(u, filtros)),
    [admin.usuarios, filtros],
  );

  const stats = useMemo<UsuarioStats>(() => {
    const total = admin.usuarios.length;
    const activos = admin.usuarios.filter((u) => u.estado === "activo").length;
    const inactivos = admin.usuarios.filter((u) => u.estado === "inactivo").length;
    const suspendidos = admin.usuarios.filter((u) => u.estado === "suspendido").length;
    return { total, activos, inactivos, suspendidos };
  }, [admin.usuarios]);

  return {
    usuarios: admin.usuarios,
    usuariosFiltrados,
    stats,
    filtros,
    setFiltros,
    resetFiltros: () => setFiltros(FILTROS_INICIALES),
    crearUsuario: admin.crearUsuario,
    editarUsuario: admin.editarUsuario,
    suspenderUsuario: admin.suspenderUsuario,
    reactivarUsuario: admin.reactivarUsuario,
  };
}
