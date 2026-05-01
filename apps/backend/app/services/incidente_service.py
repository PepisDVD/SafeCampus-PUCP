"""
📁 apps/backend/app/services/incidente_service.py
🎯 Lógica de negocio para incidentes — listado y creación.
📦 Capa: Servicios
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.incidente_repository import IncidenteRepository
from app.schemas.incidente import (
    IncidenteCreated,
    IncidenteCreateInput,
    IncidenteListItem,
)


class IncidenteService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = IncidenteRepository(db)

    async def listar_recentes(self, limit: int = 20) -> list[IncidenteListItem]:
        safe_limit = max(1, min(limit, 100))
        rows = await self._repo.list_recentes(limit=safe_limit)
        return [self._map_list_item(r) for r in rows]

    async def listar_mis_incidentes(
        self,
        usuario_id: str,
        limit: int = 50,
    ) -> list[IncidenteListItem]:
        safe_limit = max(1, min(limit, 100))
        rows = await self._repo.list_by_reportante(usuario_id, limit=safe_limit)
        return [self._map_list_item(r) for r in rows]

    async def crear_incidente(
        self,
        reportante_id: str,
        data: IncidenteCreateInput,
    ) -> IncidenteCreated:
        creado = await self._repo.create_incidente(
            reportante_id=reportante_id,
            data={
                "titulo": data.titulo.strip(),
                "descripcion": data.descripcion.strip(),
                "categoria": data.categoria.strip() if data.categoria else None,
                "lugar_referencia": (
                    data.lugar_referencia.strip() if data.lugar_referencia else None
                ),
                "canal_origen": "WEB",
            },
        )
        return IncidenteCreated.model_validate(creado)

    @staticmethod
    def _map_list_item(row: dict[str, Any]) -> IncidenteListItem:
        return IncidenteListItem(
            id=str(row["id"]),
            codigo=row["codigo"],
            titulo=row["titulo"],
            descripcion=row.get("descripcion"),
            estado=row["estado"],
            severidad=row.get("severidad"),
            categoria=row.get("categoria"),
            lugar_referencia=row.get("lugar_referencia"),
            canal_origen=row["canal_origen"],
            operador_nombre=row.get("operador_nombre"),
            created_at=row.get("created_at"),
        )