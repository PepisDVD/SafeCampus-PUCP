<!-- 📁 README.md -->
<!-- 🎯 Documentación principal del proyecto: setup, stack, estructura y guía de desarrollo. -->

# SafeCampus PUCP

Plataforma omnicanal para la gestión centralizada, trazable y asistida de incidentes en el campus de la Pontificia Universidad Católica del Perú.

## Estado actual del proyecto

- Monorepo inicializado (pnpm + Turborepo)
- Backend base con FastAPI y conexión PostgreSQL async (SQLAlchemy + asyncpg)
- Frontend base con Next.js (App Router)
- Estructura de módulos lista para implementación por fases
- Migraciones habilitadas con Alembic sobre Supabase

## Estructura del proyecto

| Carpeta | Descripción |
|---------|-------------|
| `apps/backend/` | API Backend — Python + FastAPI |
| `apps/web/` | Frontend Web + PWA — Next.js + TypeScript |
| `apps/mobile/` | Frontend Operador — React Native + Expo |
| `packages/shared-types/` | Tipos TypeScript compartidos |
| `packages/ui-kit/` | Componentes UI compartidos (futuro) |
| `infra/` | Docker, scripts de BD, configuración |
| `docs/` | Documentación técnica y ADRs |
| `repo-safeCampus-UI-Base-Figma/` | Referencia visual exportada de Figma (solo lectura) |

## Requisitos

- Node.js >= 20
- pnpm >= 9
- Python >= 3.12
- Proyecto Supabase activo (PostgreSQL)

## Configuración de entorno

### Backend

1. Copiar `apps/backend/.env.example` a `apps/backend/.env`
2. Definir `DATABASE_URL`

Ejemplo con Supabase (recomendado para pruebas compartidas):

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/postgres?ssl=require
```

Notas importantes:
- Si tu password tiene `#`, debes codificarlo como `%23`
- El backend usa driver async, por eso la URL debe iniciar con `postgresql+asyncpg://`

### Esquema (Alembic)

Aplicar versión actual del esquema en Supabase:

```powershell
cd apps/backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

Comandos útiles:

```powershell
alembic current
alembic history --verbose
alembic revision --autogenerate -m "descripcion"
```

### Frontend

1. Copiar `apps/web/.env.local.example` a `apps/web/.env.local`
2. Validar al menos estas variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

## Levantar el proyecto (Windows / PowerShell)

```powershell
# 1) Instalar dependencias del monorepo
pnpm install

# 2) Preparar backend (solo la primera vez)
cd apps/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cd ../..

# 3) Levantar backend (Terminal 1)
cd apps/backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

En una segunda terminal:

```powershell
# 4) Levantar frontend (Terminal 2)
cd apps/web
pnpm dev
```

## Verificación rápida

Con backend y frontend levantados:

- Backend health: `http://localhost:8000/health`
- Backend docs: `http://localhost:8000/api/v1/docs`
- Frontend: `http://localhost:3000`

## Scripts útiles (raíz)

```bash
pnpm dev:web       # Levanta web por turbo
pnpm dev:backend   # Levanta backend (sin activar venv automáticamente)
pnpm build         # Build de workspaces
pnpm test          # Tests de workspaces
pnpm db:migrate    # Ejecuta alembic upgrade head
pnpm db:current    # Muestra revisión actual de alembic
pnpm db:history    # Muestra historial de migraciones
```

## Trabajo en equipo (2 personas)

- Si ambos usan el mismo `DATABASE_URL` (Supabase), ambos ven los mismos datos
- La sincronización de datos es compartida por base de datos
- Realtime instantáneo (sin recargar) se implementará en una fase posterior

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2.0 · Pydantic v2 |
| Frontend Web/PWA | Next.js 16 · React 19 · TypeScript · Tailwind CSS |
| Frontend Móvil | React Native · Expo · TypeScript |
| Base de datos | PostgreSQL 16 · PostGIS 3.4 |
| IA/Clasificación | OpenAI API · Reglas de negocio |
| Monorepo | pnpm workspaces · Turborepo |

## Arquitectura

El sistema sigue el modelo C4 con 3 niveles documentados:
- **C1 — Contexto**: SafeCampus + actores + sistemas externos
- **C2 — Contenedores**: 3 frontends + 1 backend + BD + servicios
- **C3 — Componentes**: Módulos internos del backend

Ver `docs/` para documentación detallada.

## Autores

- Luis David Pachas Atuncar
- Yomira Rossana Salazar Canto

Asesor: José Antonio Pow Sang Portillo
