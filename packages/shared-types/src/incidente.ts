/**
 * 📁 packages/shared-types/src/incidente.ts
 * 🎯 Interface TypeScript del expediente único de incidente.
 * 📦 Capa: Packages / Shared Types
 */

import { EstadoIncidente, NivelSeveridad, TipoCanal } from "./enums";

export interface Incidente {
  id: string;
  codigo: string; // INC-YYYYMMDD-XXXXX
  titulo: string;
  descripcion: string;
  estado: EstadoIncidente;
  severidad: NivelSeveridad;
  categoria: string | null;
  canal_origen: TipoCanal;
  latitud: number | null;
  longitud: number | null;
  reportante_id: string;
  operador_asignado_id: string | null;
  supervisor_id: string | null;
  created_at: string;
  updated_at: string;
}
