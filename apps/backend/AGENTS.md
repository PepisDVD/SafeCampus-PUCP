# apps/backend — Agent Rules

## Overview
FastAPI backend for SafeCampus PUCP. Python 3.12, async-first, PostgreSQL + PostGIS.

## Stack
- **Framework**: FastAPI + Pydantic v2
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic (sole owner of DB schema)
- **DB**: PostgreSQL 16 + PostGIS
- **Auth**: Google OAuth (Gmail PUCP @pucp.edu.pe) + JWT + RBAC

## Commands
```bash
cd apps/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
alembic upgrade head
alembic revision --autogenerate -m "description"
pytest
```

## Structure
```
app/
├── api/v1/          # Route handlers
├── core/            # Config, database, security
├── models/          # SQLAlchemy models
├── schemas/         # Pydantic schemas
├── services/        # Business logic
├── repositories/    # Data access layer
├── integrations/    # External service clients (OpenAI, WhatsApp, etc.)
├── llm/             # LLM prompt management
└── websockets/      # WebSocket handlers
```

## Conventions
- Repository pattern: models → repositories → services → api
- All routes versioned under `/api/v1/`
- Pydantic schemas for request/response validation
- Async everywhere (asyncpg, async SQLAlchemy)

## Anti-patterns
- **Never** use `supabase db push` — Alembic owns all migrations
- **Never** import frontend packages
- **Never** put SQL in route handlers — use repositories
- **Never** hardcode secrets — use `app.core.config`
- **Never** skip Pydantic validation on request/response boundaries
