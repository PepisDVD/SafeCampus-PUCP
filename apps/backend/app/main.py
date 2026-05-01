"""
📁 apps/backend/app/main.py
🎯 Punto de entrada de FastAPI — configura la app, middleware CORS, lifespan y routers.
📦 Capa: App / Raíz del backend
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: startup y shutdown."""
    # Startup
    print(f"🚀 SafeCampus Backend v{settings.VERSION} iniciando...")
    yield
    # Shutdown
    print("🛑 SafeCampus Backend cerrando...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API Backend centralizada de SafeCampus PUCP — Gestión omnicanal de incidentes",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    """Verificación de estado del servicio."""
    return {"status": "ok", "version": settings.VERSION, "service": "safecampus-backend"}
