---
name: fastapi-clean-architecture
description: FastAPI layered architecture with repositories, services, and Alembic migrations.
---

# Skill: FastAPI Clean Architecture

Use this skill when implementing backend features in `apps/backend`.

## Goals
- Keep clear layered responsibilities.
- Keep API handlers thin.
- Keep data access and business logic testable.

## SafeCampus Checklist
- Respect flow:
  - `models -> repositories -> services -> api/v1`
- Model existing database tables with SQLAlchemy declarative classes before using them in repositories:
  - Group models by database schema, e.g. `app/models/sc_users.py`, `app/models/sc_dashboard.py`.
  - Set `__table_args__ = {"schema": "schema_name"}` on each model.
  - Prefer repository queries through these models; use raw SQL only for complex/reporting queries that are clearer as SQL.
- Add request/response schemas in `app/schemas`.
- Register routers in `app/api/v1/router.py`.
- Keep config/secrets in `app/core`.
- Add migration when model changes:
  - `pnpm db:makemigrations`
  - `pnpm db:migrate`
- After database schema changes, verify backend model coverage:
  - `pnpm db:model-coverage`
  - Add/update curated models under `apps/backend/app/models/sc_*.py` for missing tables used by backend features.

## Rules
- Do not place SQL or business rules directly in route handlers.
- Do not skip schema validation at API boundaries.
- Do not create ad-hoc Python equivalents of `database.types.ts`; backend database context should come from SQLAlchemy models plus Pydantic API schemas.
- Do not auto-overwrite curated ORM models from generated output; use introspection/codegen as a review aid and promote changes deliberately.
