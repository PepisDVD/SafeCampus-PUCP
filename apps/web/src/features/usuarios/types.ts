/**
 * 📁 apps/web/src/features/usuarios/types.ts
 * 🎯 Tipos del módulo de Gestión de Usuarios (UC-GU-02..04).
 *    Proyección local sobre el modelo compartido `Usuario` adaptada a la UI.
 * 📦 Feature: Usuarios
 */

import type { EstadoUsuario, RolUsuario } from "@/constants/roles";

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  codigo: string;
  departamento: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  ultimoAcceso: string | null;
  createdAt: string;
}

export interface UsuarioFilters {
  busqueda: string;
  rol: RolUsuario | "todos";
  estado: EstadoUsuario | "todos";
}

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  codigo: string;
  departamento: string;
  rol: RolUsuario;
}

export interface EditarUsuarioInput {
  nombre: string;
  email: string;
  codigo: string;
  departamento: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
}

export interface UsuarioStats {
  total: number;
  activos: number;
  inactivos: number;
  suspendidos: number;
}

export type AdminTabId = "usuarios" | "roles" | "integraciones" | "auditoria";
