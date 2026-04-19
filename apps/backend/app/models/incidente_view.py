from dataclasses import dataclass

from app.core.constants import EstadoIncidente, NivelSeveridad, TipoCanal


@dataclass(slots=True)
class IncidenteView:
    id: str
    codigo: str
    titulo: str
    estado: EstadoIncidente
    severidad: NivelSeveridad
    zona: str
    canal_origen: TipoCanal
    operador_nombre: str | None
