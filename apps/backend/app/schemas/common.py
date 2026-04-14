"""
📁 apps/backend/app/schemas/common.py
🎯 Esquemas Pydantic compartidos: paginación, geolocalización, respuestas genéricas.
📦 Capa: Schemas
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int
    items: list


class GeoPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    precision_metros: float | None = None
    altitud: float | None = None


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str
    code: str | None = None


class AuditInfo(BaseModel):
    created_at: datetime
    updated_at: datetime
    created_by: UUID | None = None
