"""
📁 apps/backend/app/core/audit.py
🎯 Taxonomía estandarizada para el log de auditoría centralizado.
📦 Capa: Core / Infraestructura

Fuente única de verdad para los valores de `modulo`, `accion` y `entidad` que se
escriben en `sc_auditoria.registro_auditoria`, además de las claves permitidas
dentro de `detalle`.

Convenciones:
  - `modulo` y `accion` se almacenan en minúsculas (snake_case) para alinear con
    los valores históricos ya existentes (`incidentes`, `alertas`, `gis`).
  - La auditoría debe concentrarse en eventos funcionales y de seguridad
    relevantes. NO se auditan consultas de solo lectura, búsquedas, filtros ni
    movimientos de mapa.
  - NUNCA almacenar contraseñas, tokens, secretos ni datos sensibles en `detalle`.
"""

from enum import StrEnum
from typing import Any


class AuditModulo(StrEnum):
    """Módulos funcionales que generan auditoría."""

    USUARIOS = "usuarios"
    ROLES = "roles"
    INCIDENTES = "incidentes"
    ALERTAS = "alertas"
    UBICACIONES = "ubicaciones"
    LOST_FOUND = "lost_found"
    GIS = "gis"
    INTEGRACIONES = "integraciones"
    SEGURIDAD = "seguridad"
    CONFIGURACION = "configuracion"


class AuditAccion(StrEnum):
    """Verbos estandarizados de acción."""

    CREAR = "crear"
    EDITAR = "editar"
    DESACTIVAR = "desactivar"
    ACTIVAR = "activar"
    SUSPENDER = "suspender"
    CAMBIAR_ESTADO = "cambiar_estado"
    CAMBIAR_ROL = "cambiar_rol"
    ASIGNAR_OPERADOR = "asignar_operador"
    PUBLICAR = "publicar"
    CANCELAR = "cancelar"
    FINALIZAR = "finalizar"
    EXPORTAR = "exportar"
    VERIFICAR = "verificar"
    ACCESO_DENEGADO = "acceso_denegado"
    # Acciones específicas conservadas por compatibilidad / tests existentes.
    GENERAR_EXPEDIENTE_CIERRE = "generar_expediente_cierre"
    GENERAR_BORRADOR_CIERRE_IA = "generar_borrador_cierre_ia"
    ACTUALIZAR_CUSTODIA = "actualizar_custodia"


class AuditEntidad(StrEnum):
    """Entidades de negocio auditables."""

    USUARIO = "usuario"
    ROL = "rol"
    INCIDENTE = "incidente"
    ALERTA = "alerta"
    UBICACION_MAESTRA = "ubicacion_maestra"
    OBJETO_PERDIDO = "objeto_perdido"
    CASO_LOST_FOUND = "caso_lost_found"
    CUSTODIA_OBJETO = "custodia_objeto"
    INTEGRACION = "integracion"


class AuditOrigen(StrEnum):
    """Origen de la acción auditada (se guarda en `detalle.origen`)."""

    WEB = "WEB"
    APP_MOVIL = "APP_MOVIL"
    WHATSAPP = "WHATSAPP"
    SISTEMA = "SISTEMA"


class AuditResultado(StrEnum):
    """Resultado de la acción auditada (se guarda en `detalle.resultado`)."""

    EXITOSO = "exitoso"
    FALLIDO = "fallido"
    DENEGADO = "denegado"


def build_detalle(
    *,
    origen: AuditOrigen | str | None = None,
    resultado: AuditResultado | str | None = None,
    codigo_entidad: str | None = None,
    resumen: str | None = None,
    before: Any | None = None,
    after: Any | None = None,
    correlation_id: str | None = None,
    **extra: Any,
) -> dict[str, Any]:
    """Compone el JSON de `detalle` usando únicamente las claves estándar
    permitidas. Las claves con valor ``None`` se omiten. No incluir datos
    sensibles en ``extra``.
    """
    detalle: dict[str, Any] = {}
    if origen is not None:
        detalle["origen"] = str(origen)
    if resultado is not None:
        detalle["resultado"] = str(resultado)
    if codigo_entidad is not None:
        detalle["codigo_entidad"] = codigo_entidad
    if resumen is not None:
        detalle["resumen"] = resumen
    if before is not None:
        detalle["before"] = before
    if after is not None:
        detalle["after"] = after
    if correlation_id is not None:
        detalle["correlation_id"] = correlation_id
    for key, value in extra.items():
        if value is not None:
            detalle[key] = value
    return detalle
