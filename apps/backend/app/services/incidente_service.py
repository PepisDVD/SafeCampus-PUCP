from app.models.incidente_view import IncidenteView
from app.repositories.incidente_repository import IncidenteRepository


class IncidenteService:
    def __init__(self, repository: IncidenteRepository | None = None) -> None:
        self._repository = repository or IncidenteRepository()

    async def listar_recentes(self, limit: int = 20) -> list[IncidenteView]:
        safe_limit = max(1, min(limit, 100))
        return await self._repository.list_recentes(limit=safe_limit)
