from pydantic import BaseModel, ConfigDict

from app.core.constants import EstadoIncidente, NivelSeveridad, TipoCanal


class IncidenteListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    codigo: str
    titulo: str
    estado: EstadoIncidente
    severidad: NivelSeveridad
    zona: str
    canal_origen: TipoCanal
    operador_nombre: str | None


class IncidenteListResponse(BaseModel):
    items: list[IncidenteListItem]
    total: int
