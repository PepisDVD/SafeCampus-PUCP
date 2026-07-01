"""
📁 apps/backend/app/main.py
🎯 Punto de entrada de FastAPI — configura la app, middleware CORS, lifespan y routers.
📦 Capa: App / Raíz del backend
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Ciclo de vida de la aplicación: startup y shutdown."""
    # Startup
    # Configura el logging de la app para que los logs INFO (p. ej. la traza del
    # webhook de WhatsApp) sean visibles. Sin esto, el root logger queda en
    # WARNING bajo uvicorn y los INFO de `app.*` no se emiten.
    logging.basicConfig(
        level=logging.INFO if settings.DEBUG else logging.WARNING,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("app").setLevel(logging.INFO if settings.DEBUG else logging.WARNING)
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
    allow_origins=settings.cors_origins_effective,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Verificación de estado del servicio."""
    return {"status": "ok", "version": settings.VERSION, "service": "safecampus-backend"}
