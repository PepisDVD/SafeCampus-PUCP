from app.core.constants import EstadoIncidente, NivelSeveridad, TipoCanal
from app.models.incidente_view import IncidenteView


class IncidenteRepository:
    """Repositorio temporal para lectura de incidentes.

    Nota: mientras se completa el modelado SQLAlchemy del dominio, esta capa
    entrega datos mockeados para habilitar la vertical API->Service->Repo.
    """

    def __init__(self) -> None:
        self._items: list[IncidenteView] = [
            IncidenteView(
                id="e5ce13d7-1e7b-4d8f-9e63-bf032f95b14b",
                codigo="INC-20260418-0001",
                titulo="Robo de laptop en biblioteca central",
                estado=EstadoIncidente.EN_ATENCION,
                severidad=NivelSeveridad.ALTO,
                zona="Biblioteca Central",
                canal_origen=TipoCanal.WEB,
                operador_nombre="Jorge Salinas",
            ),
            IncidenteView(
                id="7f63d3eb-7ab9-4ef3-80e4-6f01b594f40e",
                codigo="INC-20260418-0002",
                titulo="Persona sospechosa en estacionamiento",
                estado=EstadoIncidente.RECIBIDO,
                severidad=NivelSeveridad.MEDIO,
                zona="Estacionamiento Principal",
                canal_origen=TipoCanal.MENSAJERIA,
                operador_nombre=None,
            ),
            IncidenteView(
                id="c48cc5f4-63e4-4a43-b98c-b8adf64091f8",
                codigo="INC-20260418-0003",
                titulo="Emergencia medica en Patio de Letras",
                estado=EstadoIncidente.EN_ATENCION,
                severidad=NivelSeveridad.CRITICO,
                zona="Patio de Letras",
                canal_origen=TipoCanal.MOVIL,
                operador_nombre="Rosa Quispe",
            ),
        ]

    async def list_recentes(self, limit: int = 20) -> list[IncidenteView]:
        return self._items[:limit]
