from fastapi import APIRouter

from app.api.v1 import incidentes, lost_found, notificaciones, omnicanal
from app.api.v1 import admin, auth

api_router = APIRouter()
api_router.include_router(
    incidentes.router,
    prefix="/incidentes",
    tags=["Incidentes"],
)
api_router.include_router(
    lost_found.router,
    prefix="/lost-found",
    tags=["Lost & Found"],
)
api_router.include_router(
    notificaciones.router,
    prefix="/notificaciones",
    tags=["Notificaciones"],
)
api_router.include_router(
    omnicanal.router,
    prefix="/omnicanal",
    tags=["Omnicanal"],
)
api_router.include_router(
    auth.router,
    prefix="/auth",
)
api_router.include_router(
    admin.router,
    prefix="/admin",
)


@api_router.get("/", tags=["Root"])
async def api_root():
    return {"message": "SafeCampus PUCP API v1", "docs": "/api/v1/docs"}
