/**
 * 📁 apps/web/src/features/integraciones/types.ts
 * 🎯 Tipos del panel de integraciones externas (UC-GU-05).
 *    Refleja el estado operativo de cada servicio de terceros.
 * 📦 Feature: Integraciones
 */

export type EstadoIntegracion = "operativo" | "degradado" | "inactivo";

export type CategoriaIntegracion =
  | "mensajeria"
  | "ia"
  | "mapas"
  | "correo"
  | "autenticacion";

export interface Integracion {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaIntegracion;
  estado: EstadoIntegracion;
  ultimaVerificacion: string;
  latenciaMs: number | null;
  mensajeEstado: string;
}
