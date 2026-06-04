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

export enum CanalNotificacion {
  EMAIL = "EMAIL",
  PUSH = "PUSH",
  SMS = "SMS",
  WHATSAPP = "WHATSAPP",
  INAPP = "INAPP",
}

export enum EstadoNotificacion {
  PENDIENTE = "PENDIENTE",
  ENVIADA = "ENVIADA",
  FALLIDA = "FALLIDA",
  DESCARTADA = "DESCARTADA",
}

export enum EstadoAlertaCampus {
  BORRADOR = "BORRADOR",
  PENDIENTE_APROBACION = "PENDIENTE_APROBACION",
  PROGRAMADA = "PROGRAMADA",
  ACTIVA = "ACTIVA",
  EN_ATENCION = "EN_ATENCION",
  ATENDIDA = "ATENDIDA",
  EXPIRADA = "EXPIRADA",
  ENVIADA = "ENVIADA",
  FINALIZADA = "FINALIZADA",
  CANCELADA = "CANCELADA",
}

export enum OrigenAlerta {
  MANUAL = "MANUAL",
  AUTOMATICA = "AUTOMATICA",
}

export enum TipoSegmentoAlerta {
  ROL = "ROL",
  DEPARTAMENTO = "DEPARTAMENTO",
  USUARIO = "USUARIO",
  ZONA = "ZONA",
}

export enum EstadoCasoLF {
  ABIERTO = "ABIERTO",
  EN_REVISION = "EN_REVISION",
  CONFIRMADO = "CONFIRMADO",
  EN_CUSTODIA = "EN_CUSTODIA",
  DEVUELTO = "DEVUELTO",
  DESCARTADO = "DESCARTADO",
  CERRADO = "CERRADO",
}

export enum TipoCasoLF {
  PERDIDO = "PERDIDO",
  ENCONTRADO = "ENCONTRADO",
}

export enum EstadoMatchLF {
  SUGERIDO = "SUGERIDO",
  CONFIRMADO = "CONFIRMADO",
  DESCARTADO = "DESCARTADO",
  EXPIRADO = "EXPIRADO",
}

export enum MotivoCierreLF {
  CANCELADO_USUARIO = "CANCELADO_USUARIO",
  DEVUELTO = "DEVUELTO",
  DESCARTADO = "DESCARTADO",
  DONADO = "DONADO",
  ADMINISTRATIVO = "ADMINISTRATIVO",
}

export enum EstadoCustodia {
  ACTIVA = "ACTIVA",
  PROXIMA_VENCER = "PROXIMA_VENCER",
  VENCIDA = "VENCIDA",
  DEVUELTA = "DEVUELTA",
  DESCARTADA = "DESCARTADA",
}

export enum EstadoAcompanamiento {
  PENDIENTE = "PENDIENTE",
  ACTIVO = "ACTIVO",
  ALERTA = "ALERTA",
  FINALIZADO = "FINALIZADO",
  CANCELADO = "CANCELADO",
}
