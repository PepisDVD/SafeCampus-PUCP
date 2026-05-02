"""
📁 apps/backend/app/services/incidente_service.py
🎯 Lógica de negocio para incidentes — listado, detalle y creación.
📦 Capa: Servicios
"""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.incidente_repository import IncidenteRepository
from app.schemas.incidente import (
    HistorialEvento,
    IncidenteCreated,
    IncidenteCreateInput,
    IncidenteDetail,
    IncidenteListItem,
    UsuarioMini,
)


class IncidenteService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = IncidenteRepository(db)

    async def listar_recentes(
        self,
        *,
        search: str | None = None,
        severidad: str | None = None,
        estado: str | None = None,
        limit: int = 20,
    ) -> list[IncidenteListItem]:
        safe_limit = max(1, min(limit, 200))
        rows = await self._repo.list_recentes(
            search=search,
            severidad=severidad,
            estado=estado,
            limit=safe_limit,
        )
        return [self._map_list_item(r) for r in rows]

    async def listar_mis_incidentes(
        self,
        usuario_id: str,
        limit: int = 50,
    ) -> list[IncidenteListItem]:
        safe_limit = max(1, min(limit, 100))
        rows = await self._repo.list_by_reportante(usuario_id, limit=safe_limit)
        return [self._map_list_item(r) for r in rows]

    async def obtener_detalle(self, incidente_id: str) -> IncidenteDetail:
        try:
            UUID(incidente_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de incidente inválido.",
            ) from exc

        row = await self._repo.get_detail_by_id(incidente_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incidente no encontrado.",
            )

        historial_rows = await self._repo.list_historial(incidente_id)

        return IncidenteDetail(
            id=str(row["id"]),
            codigo=row["codigo"],
            titulo=row["titulo"],
            descripcion=row["descripcion"],
            estado=row["estado"],
            severidad=row.get("severidad"),
            categoria=row.get("categoria"),
            lugar_referencia=row.get("lugar_referencia"),
            canal_origen=row["canal_origen"],
            fecha_primera_respuesta=row.get("fecha_primera_respuesta"),
            fecha_resolucion=row.get("fecha_resolucion"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            reportante=self._build_usuario_mini(
                row.get("reportante_id"),
                row.get("reportante_nombre"),
                row.get("reportante_apellido"),
                row.get("reportante_email"),
                row.get("reportante_avatar_url"),
            ),
            operador_asignado=self._build_usuario_mini(
                row.get("operador_asignado_id"),
                row.get("operador_nombre"),
                row.get("operador_apellido"),
                row.get("operador_email"),
                row.get("operador_avatar_url"),
            ),
            supervisor=self._build_usuario_mini(
                row.get("supervisor_id"),
                row.get("supervisor_nombre"),
                row.get("supervisor_apellido"),
                row.get("supervisor_email"),
                row.get("supervisor_avatar_url"),
            ),
            historial=[self._map_historial(h) for h in historial_rows],
        )

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
    def _build_usuario_mini(
        user_id: Any,
        nombre: str | None,
        apellido: str | None,
        email: str | None,
        avatar_url: str | None,
    ) -> UsuarioMini | None:
        if not user_id:
            return None
        full_name = f"{nombre or ''} {apellido or ''}".strip() or "Usuario"
        return UsuarioMini(
            id=str(user_id),
            nombre_completo=full_name,
            email=email,
            avatar_url=avatar_url,
        )

    @classmethod
    def _map_historial(cls, row: dict[str, Any]) -> HistorialEvento:
        ejecutor = cls._build_usuario_mini(
            row.get("ejecutado_por_id"),
            row.get("ejecutor_nombre"),
            row.get("ejecutor_apellido"),
            row.get("ejecutor_email"),
            row.get("ejecutor_avatar_url"),
        )
        return HistorialEvento(
            id=str(row["id"]),
            estado_anterior=row.get("estado_anterior"),
            estado_nuevo=row["estado_nuevo"],
            accion=row["accion"],
            comentario=row.get("comentario"),
            ejecutado_por=ejecutor,
            created_at=row["created_at"],
        )

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
            operador_avatar_url=row.get("operador_avatar_url"),
            created_at=row.get("created_at"),
        )