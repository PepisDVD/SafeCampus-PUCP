from fastapi import APIRouter

from app.api.v1 import admin, auth, incidentes, profile

api_router = APIRouter()
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Auth"],
)
api_router.include_router(
    incidentes.router,
    prefix="/incidentes",
    tags=["Incidentes"],
)
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"],
)
api_router.include_router(
    profile.router,
    prefix="/profile",
    tags=["Profile"],
)


@api_router.get("/", tags=["Root"])
async def api_root():
    return {"message": "SafeCampus PUCP API v1", "docs": "/api/v1/docs"}
