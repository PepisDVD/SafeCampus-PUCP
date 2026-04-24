/**
 * 📁 apps/web/src/features/auditoria/types.ts
 * 🎯 Tipos del log de auditoría transversal (UC-GU-02..05).
 *    Cada operación administrativa relevante deja una entrada aquí.
 * 📦 Feature: Auditoría
 */

export type TipoEventoAuditoria =
  | "usuario_creado"
  | "usuario_editado"
  | "usuario_suspendido"
  | "usuario_reactivado"
  | "rbac_modificado"
  | "integracion_verificada"
  | "integracion_alerta"
  | "otro";

export interface EventoAuditoria {
  id: string;
  tipo: TipoEventoAuditoria;
  actor: string;
  accion: string;
  detalle: string;
  timestamp: string;
}

export interface AuditoriaFilters {
  busqueda: string;
  tipo: TipoEventoAuditoria | "todos";
  desde: string | null;
  hasta: string | null;
}
