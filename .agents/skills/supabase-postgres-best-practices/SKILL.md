---
name: supabase-postgres-best-practices
description: Remote Supabase usage, typed clients, auth middleware, and DB safety rules.
---

# Skill: Supabase + Postgres Best Practices

Use this skill for auth, typed database access, and schema safety.

## Goals
- Supabase is remote-only for this project.
- Type generation is automated and committed.
- Alembic is the only schema migration owner.

## SafeCampus Checklist
- Read/write Supabase clients through `packages/data`.
- Generate DB types with:
  - `pnpm gen:types`
- Keep DB migration flow in backend:
  - `pnpm db:makemigrations`
  - `pnpm db:migrate`
- Validate env vars before runtime:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (backend-only)
  - `DATABASE_URL` (backend/Alembic)

## Rules
- Do not use local Supabase containers for primary DB workflow.
- Do not run `supabase db push`; Alembic controls schema history.
- Do not expose service role keys in web runtime.
