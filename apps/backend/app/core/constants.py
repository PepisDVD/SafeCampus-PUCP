"""
📁 apps/backend/app/core/constants.py
🎯 Los 18 ENUMs del sistema sincronizados con los tipos ENUM de PostgreSQL.
📦 Capa: Core / Infraestructura
"""

from enum import StrEnum


# --- sc_users ---
class EstadoUsuario(StrEnum):
    ACTIVO = "ACTIVO"
    INACTIVO = "INACTIVO"
    SUSPENDIDO = "SUSPENDIDO"


class EstadoSesion(StrEnum):
    ACTIVA = "ACTIVA"
    EXPIRADA = "EXPIRADA"
    REVOCADA = "REVOCADA"


class TipoDispositivo(StrEnum):
    WEB = "WEB"
    MOVIL = "MOVIL"
    TABLET = "TABLET"


# --- sc_omnicanal ---
class TipoCanal(StrEnum):
    WEB = "WEB"
    MOVIL = "MOVIL"
    MENSAJERIA = "MENSAJERIA"


class EstadoReporte(StrEnum):
    RECIBIDO = "RECIBIDO"
    NORMALIZADO = "NORMALIZADO"
    ENRUTADO = "ENRUTADO"
    ERROR = "ERROR"


# --- sc_incidentes ---
class EstadoIncidente(StrEnum):
    RECIBIDO = "RECIBIDO"
    EN_EVALUACION = "EN_EVALUACION"
    EN_ATENCION = "EN_ATENCION"
    ESCALADO = "ESCALADO"
    PENDIENTE_INFO = "PENDIENTE_INFO"
    RESUELTO = "RESUELTO"
    CERRADO = "CERRADO"


class NivelSeveridad(StrEnum):
    BAJO = "BAJO"
    MEDIO = "MEDIO"
    ALTO = "ALTO"
    CRITICO = "CRITICO"


# --- sc_clasificacion ---
class OrigenClasificacion(StrEnum):
    IA = "IA"
    REGLA = "REGLA"
    FALLBACK = "FALLBACK"
    HUMANO = "HUMANO"


# --- sc_notificaciones ---
class CanalNotificacion(StrEnum):
    EMAIL = "EMAIL"
    PUSH = "PUSH"
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"
    INAPP = "INAPP"


class EstadoNotificacion(StrEnum):
    PENDIENTE = "PENDIENTE"
    ENVIADA = "ENVIADA"
    FALLIDA = "FALLIDA"
    DESCARTADA = "DESCARTADA"


# --- sc_dashboard ---
class TipoKPI(StrEnum):
    FRT = "FRT"
    TMR = "TMR"
    VOLUMEN = "VOLUMEN"
    DISTRIBUCION = "DISTRIBUCION"
    TASA_RESOLUCION = "TASA_RESOLUCION"


# --- sc_lost_found ---
class TipoCasoLF(StrEnum):
    PERDIDO = "PERDIDO"
    ENCONTRADO = "ENCONTRADO"


class EstadoCasoLF(StrEnum):
    ABIERTO = "ABIERTO"
    EN_REVISION = "EN_REVISION"
    DEVUELTO = "DEVUELTO"
    DESCARTADO = "DESCARTADO"
    CERRADO = "CERRADO"


# --- sc_acompanamiento ---
class EstadoAcompanamiento(StrEnum):
    PENDIENTE = "PENDIENTE"
    ACTIVO = "ACTIVO"
    ALERTA = "ALERTA"
    FINALIZADO = "FINALIZADO"
    CANCELADO = "CANCELADO"


class TipoAlertaAS(StrEnum):
    MANUAL = "MANUAL"
    VENCIMIENTO = "VENCIMIENTO"
    DESCONEXION = "DESCONEXION"


class EstadoAlerta(StrEnum):
    ACTIVA = "ACTIVA"
    ATENDIDA = "ATENDIDA"
    CANCELADA = "CANCELADA"


class TipoEventoAS(StrEnum):
    INICIO = "INICIO"
    ALERTA = "ALERTA"
    DESCONEXION = "DESCONEXION"
    RECONEXION = "RECONEXION"
    FIN = "FIN"
    CANCELACION = "CANCELACION"


# --- sc_dashboard (monitoreo) ---
class EstadoServicio(StrEnum):
    OK = "OK"
    DEGRADADO = "DEGRADADO"
    CAIDO = "CAIDO"
    DESCONOCIDO = "DESCONOCIDO"


# --- Numeración única ---
INCIDENT_CODE_PREFIX = "INC"
LOST_FOUND_CODE_PREFIX = "LF"
