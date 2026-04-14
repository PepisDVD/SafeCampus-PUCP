"""
📁 apps/backend/app/api/v1/router.py
🎯 Router principal que registra todos los sub-routers por módulo funcional.
📦 Capa: API / v1
"""

from fastapi import APIRouter

api_router = APIRouter()


# TODO: Agregar sub-routers por módulo funcional
# from app.api.v1 import auth, incidentes, usuarios, omnicanal, clasificacion
# from app.api.v1 import lost_found, acompanamiento, dashboard, notificaciones, auditoria
#
# api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
# api_router.include_router(incidentes.router, prefix="/incidentes", tags=["Incidentes"])
# api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuarios"])
# api_router.include_router(omnicanal.router, prefix="/omnicanal", tags=["Omnicanal"])
# api_router.include_router(clasificacion.router, prefix="/clasificacion", tags=["Clasificación"])
# api_router.include_router(lost_found.router, prefix="/lost-found", tags=["Lost & Found"])
# api_router.include_router(acompanamiento.router, prefix="/acompanamiento", tags=["Acompañamiento"])
# api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
# api_router.include_router(notificaciones.router, prefix="/notificaciones", tags=["Notificaciones"])
# api_router.include_router(auditoria.router, prefix="/auditoria", tags=["Auditoría"])


@api_router.get("/", tags=["Root"])
async def api_root():
    return {"message": "SafeCampus PUCP API v1", "docs": "/api/v1/docs"}
