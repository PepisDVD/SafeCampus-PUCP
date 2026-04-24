/**
 * 📁 apps/web/src/features/auditoria/mock-data.ts
 * 🎯 Eventos semilla del log de auditoría para el panel admin.
 *    Representa acciones administrativas previas al inicio de sesión actual.
 * 📦 Feature: Auditoría
 */

import type { EventoAuditoria } from "./types";

export const AUDITORIA_MOCK: EventoAuditoria[] = [
  {
    id: "EV-0001",
    tipo: "usuario_creado",
    actor: "Ana Torres Vega",
    accion: "Creó usuario Marco Díaz Lozano (OP-031)",
    detalle: "Alta de operador asignado a Seguridad Campus.",
    timestamp: "2025-02-14 09:02",
  },
  {
    id: "EV-0002",
    tipo: "usuario_suspendido",
    actor: "Ana Torres Vega",
    accion: "Suspendió usuario Sandra Rojas Huanca (SUP-002)",
    detalle: "Reportada por uso indebido del sistema durante turno nocturno.",
    timestamp: "2026-03-15 11:05",
  },
  {
    id: "EV-0003",
    tipo: "rbac_modificado",
    actor: "Ana Torres Vega",
    accion: "Actualizó matriz RBAC — módulo Lost & Found",
    detalle: "Permiso de operador en Lost & Found elevado de 'no' a 'parcial'.",
    timestamp: "2026-04-02 15:20",
  },
  {
    id: "EV-0004",
    tipo: "integracion_verificada",
    actor: "Ana Torres Vega",
    accion: "Verificó integración WhatsApp Business API",
    detalle: "Estado operativo confirmado. Latencia promedio 312 ms.",
    timestamp: "2026-04-17 08:40",
  },
  {
    id: "EV-0005",
    tipo: "integracion_alerta",
    actor: "Sistema",
    accion: "Degradación detectada en Google Maps API",
    detalle: "Throttling temporal por cuota horaria. Se notificó al administrador.",
    timestamp: "2026-04-18 21:12",
  },
  {
    id: "EV-0006",
    tipo: "usuario_editado",
    actor: "Ana Torres Vega",
    accion: "Editó rol de Elena Paredes Núñez a Comunidad",
    detalle: "Cambio solicitado por RRHH tras fin de contrato administrativo.",
    timestamp: "2026-03-10 09:15",
  },
];
