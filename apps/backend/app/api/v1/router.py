from fastapi import APIRouter

from app.api.v1 import incidentes

api_router = APIRouter()
api_router.include_router(
    incidentes.router,
    prefix="/incidentes",
    tags=["Incidentes"],
)


@api_router.get("/", tags=["Root"])
async def api_root():
    return {"message": "SafeCampus PUCP API v1", "docs": "/api/v1/docs"}
