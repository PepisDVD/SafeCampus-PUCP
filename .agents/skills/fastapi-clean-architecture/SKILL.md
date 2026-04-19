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
- Add request/response schemas in `app/schemas`.
- Register routers in `app/api/v1/router.py`.
- Keep config/secrets in `app/core`.
- Add migration when model changes:
  - `pnpm db:makemigrations`
  - `pnpm db:migrate`

## Rules
- Do not place SQL or business rules directly in route handlers.
- Do not skip schema validation at API boundaries.
