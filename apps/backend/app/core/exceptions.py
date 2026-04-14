"""
📁 apps/backend/app/core/exceptions.py
🎯 Excepciones HTTP personalizadas para respuestas de error consistentes.
📦 Capa: Core / Infraestructura
"""

from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Recurso no encontrado"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "No autorizado"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Acceso denegado"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictError(HTTPException):
    def __init__(self, detail: str = "Conflicto con el estado actual del recurso"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail: str = "Error de validación"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class ExternalServiceError(HTTPException):
    def __init__(self, detail: str = "Error en servicio externo"):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
