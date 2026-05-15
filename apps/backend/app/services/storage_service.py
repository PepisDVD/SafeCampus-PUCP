"""
📁 apps/backend/app/services/storage_service.py
🎯 Servicio de almacenamiento de archivos — Supabase Storage vía REST API.
📦 Capa: Servicios / Infraestructura
"""

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


class StorageService:
    """Wrapper sobre la REST API de Supabase Storage.

    Requiere SUPABASE_SERVICE_KEY (service_role) para operaciones de escritura.
    La URL pública resultante usa el endpoint /storage/v1/object/public/
    y requiere que el bucket esté configurado como público en Supabase.
    """

    def _auth_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_KEY,
        }

    async def upload(
        self,
        *,
        bucket: str,
        path: str,
        content: bytes,
        content_type: str,
    ) -> str:
        """Sube `content` al bucket/path indicado y retorna la URL pública.

        Usa upsert=true para sobreescribir si el path ya existe.
        """
        if not settings.SUPABASE_SERVICE_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Almacenamiento de archivos no configurado. "
                "Configura SUPABASE_SERVICE_KEY en el backend.",
            )

        upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
        headers = {
            **self._auth_headers(),
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(upload_url, content=content, headers=headers)

        if response.status_code not in (200, 201):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al subir archivo al almacenamiento ({response.status_code}): "
                f"{response.text[:300]}",
            )

        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
