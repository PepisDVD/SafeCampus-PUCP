/**
 * 📁 apps/web/src/features/usuarios/hooks/use-usuarios.ts
 * 🎯 Hook de lectura + derivados para el módulo de usuarios.
 *    Encapsula filtrado por búsqueda, rol y estado, y estadísticas agregadas.
 * 📦 Feature: Usuarios
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApi, type AdminRoleApi, type AdminUserApi } from "@/lib/api/admin";

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

const ROLE_NAME_TO_FRONT: Record<string, UsuarioAdmin["rol"]> = {
  comunidad: "comunidad",
  operador: "operador",
  supervisor: "supervisor",
  administrador: "admin",
};

const FRONT_ROLE_TO_NAME: Record<UsuarioAdmin["rol"], string> = {
  comunidad: "comunidad",
  operador: "operador",
  supervisor: "supervisor",
  admin: "administrador",
};

function toUiUser(row: AdminUserApi): UsuarioAdmin {
  const rolNombre = row.roles.find((name) => ROLE_NAME_TO_FRONT[name]) ?? "comunidad";
  const fecha = row.created_at?.replace("T", " ").slice(0, 16) ?? "";
  const ultimoAcceso = row.ultimo_acceso
    ? row.ultimo_acceso.replace("T", " ").slice(0, 16)
    : null;

  return {
    id: row.id,
    nombre: `${row.nombre} ${row.apellido}`.trim(),
    email: row.email,
    codigo: row.codigo_institucional ?? "",
    departamento: row.departamento ?? "",
    rol: ROLE_NAME_TO_FRONT[rolNombre] ?? "comunidad",
    estado: (row.estado?.toLowerCase() as UsuarioAdmin["estado"]) ?? "activo",
    ultimoAcceso,
    createdAt: fecha,
  };
}

function splitFullName(fullName: string): { nombre: string; apellido: string } {
  const chunks = fullName.trim().split(/\s+/).filter(Boolean);
  if (chunks.length <= 1) {
    return { nombre: chunks[0] ?? "Usuario", apellido: "PUCP" };
  }
  return { nombre: chunks[0] ?? "Usuario", apellido: chunks.slice(1).join(" ") };
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [roles, setRoles] = useState<AdminRoleApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<UsuarioFilters>(FILTROS_INICIALES);

  const roleIdByFrontRole = useMemo(() => {
    const map = new Map<UsuarioAdmin["rol"], string>();
    for (const role of roles) {
      const frontRole = ROLE_NAME_TO_FRONT[role.nombre];
      if (frontRole) map.set(frontRole, role.id);
    }
    return map;
  }, [roles]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listRoles(),
      ]);
      setUsuarios(usersRes.items.map(toUiUser));
      setRoles(rolesRes.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar usuarios.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const roleIdFor = useCallback(
    (rol: UsuarioAdmin["rol"]): string | null => {
      return roleIdByFrontRole.get(rol) ?? null;
    },
    [roleIdByFrontRole],
  );

  const usuariosFiltrados = useMemo(
    () => usuarios.filter((u) => coincide(u, filtros)),
    [usuarios, filtros],
  );

  const stats = useMemo<UsuarioStats>(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.estado === "activo").length;
    const inactivos = usuarios.filter((u) => u.estado === "inactivo").length;
    const suspendidos = usuarios.filter((u) => u.estado === "suspendido").length;
    return { total, activos, inactivos, suspendidos };
  }, [usuarios]);

  const crearUsuario = useCallback(
    async (input: {
      nombre: string;
      email: string;
      codigo: string;
      departamento: string;
      rol: UsuarioAdmin["rol"];
    }) => {
      const roleId = roleIdFor(input.rol);
      if (!roleId) {
        return { ok: false, mensaje: "No se pudo resolver el rol en base de datos." };
      }

      const { nombre, apellido } = splitFullName(input.nombre);
      try {
        await adminApi.createUser({
          email: input.email,
          nombre,
          apellido,
          codigo_institucional: input.codigo,
          departamento: input.departamento,
          estado: "activo",
          role_ids: [roleId],
        });
        await cargarDatos();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          mensaje: err instanceof Error ? err.message : "No se pudo crear el usuario.",
        };
      }
    },
    [cargarDatos, roleIdFor],
  );

  const editarUsuario = useCallback(
    async (
      id: string,
      input: {
        nombre: string;
        email: string;
        codigo: string;
        departamento: string;
        rol: UsuarioAdmin["rol"];
        estado: UsuarioAdmin["estado"];
      },
    ) => {
      const roleId = roleIdFor(input.rol);
      if (!roleId) {
        return { ok: false, mensaje: "No se pudo resolver el rol en base de datos." };
      }

      const { nombre, apellido } = splitFullName(input.nombre);
      try {
        await adminApi.updateUser(id, {
          email: input.email,
          nombre,
          apellido,
          codigo_institucional: input.codigo,
          departamento: input.departamento,
          estado: input.estado,
          role_ids: [roleId],
        });
        await cargarDatos();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          mensaje: err instanceof Error ? err.message : "No se pudo editar el usuario.",
        };
      }
    },
    [cargarDatos, roleIdFor],
  );

  const suspenderUsuario = useCallback(
    async (id: string) => {
      try {
        await adminApi.suspendUser(id);
        await cargarDatos();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          mensaje: err instanceof Error ? err.message : "No se pudo suspender el usuario.",
        };
      }
    },
    [cargarDatos],
  );

  const reactivarUsuario = useCallback(
    async (id: string) => {
      try {
        await adminApi.reactivateUser(id);
        await cargarDatos();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          mensaje: err instanceof Error ? err.message : "No se pudo reactivar el usuario.",
        };
      }
    },
    [cargarDatos],
  );

  return {
    usuarios,
    usuariosFiltrados,
    stats,
    filtros,
    loading,
    error,
    recargar: cargarDatos,
    setFiltros,
    resetFiltros: () => setFiltros(FILTROS_INICIALES),
    crearUsuario,
    editarUsuario,
    suspenderUsuario,
    reactivarUsuario,
    roleOptions: roles.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      frontRole: ROLE_NAME_TO_FRONT[r.nombre] ?? null,
    })),
    roleNameByFrontRole: FRONT_ROLE_TO_NAME,
  };
}
