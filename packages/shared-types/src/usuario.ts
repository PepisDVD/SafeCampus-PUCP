/**
 * 📁 packages/shared-types/src/usuario.ts
 * 🎯 Interface TypeScript del usuario del sistema.
 * 📦 Capa: Packages / Shared Types
 */

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  codigo_institucional: string | null;
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO";
  roles: string[];
  created_at: string;
}
