from fastapi import APIRouter

from app.api.v1 import (
    admin,
    alertas,
    auth,
    gis,
    incidentes,
    lost_found,
    maestros,
    notificaciones,
    omnicanal,
)

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
    maestros.router,
    prefix="/maestros",
    tags=["Maestros"],
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
    alertas.router,
    prefix="/alertas",
    tags=["Alertas"],
)
api_router.include_router(
    gis.router,
    prefix="/gis",
    tags=["GIS"],
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
