/**
 * 📁 packages/shared-types/src/enums.ts
 * 🎯 ENUMs TypeScript como source of truth del dominio de SafeCampus.
 * 📦 Capa: Packages / Shared Types
 */

export enum EstadoIncidente {
  RECIBIDO = "RECIBIDO",
  EN_EVALUACION = "EN_EVALUACION",
  EN_ATENCION = "EN_ATENCION",
  ESCALADO = "ESCALADO",
  PENDIENTE_INFO = "PENDIENTE_INFO",
  RESUELTO = "RESUELTO",
  CERRADO = "CERRADO",
}

export enum NivelSeveridad {
  BAJO = "BAJO",
  MEDIO = "MEDIO",
  ALTO = "ALTO",
  CRITICO = "CRITICO",
}

export enum TipoCanal {
  WEB = "WEB",
  MOVIL = "MOVIL",
  MENSAJERIA = "MENSAJERIA",
}

export enum EstadoCasoLF {
  ABIERTO = "ABIERTO",
  EN_REVISION = "EN_REVISION",
  DEVUELTO = "DEVUELTO",
  DESCARTADO = "DESCARTADO",
  CERRADO = "CERRADO",
}

export enum EstadoAcompanamiento {
  PENDIENTE = "PENDIENTE",
  ACTIVO = "ACTIVO",
  ALERTA = "ALERTA",
  FINALIZADO = "FINALIZADO",
  CANCELADO = "CANCELADO",
}
