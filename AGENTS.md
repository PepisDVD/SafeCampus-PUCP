# SafeCampus PUCP - Monorepo Agent Rules

## Overview
SafeCampus PUCP is an omnichannel platform for centralized incident management at university campus scale.

This repo uses pnpm workspaces + Turborepo.

## Stack
- Backend: Python 3.12 + FastAPI + Alembic + PostgreSQL/PostGIS (`apps/backend`)
- Web: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn (`apps/web`)
- Mobile: React Native planned (`apps/mobile`)
- Data package: Supabase clients and query helpers (`packages/data`)
- Shared types: Domain and DB types (`packages/shared-types`)
- Shared UI kit: Reusable components (`packages/ui-kit`)
- Shared config: ESLint/TSConfig/Tailwind (`packages/config`)

## Root Commands
```bash
pnpm dev:web
pnpm dev:backend
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm gen:types
pnpm db:makemigrations
pnpm db:migrate
```

## Architecture Decisions
- Supabase is remote-only (no local DB stack as primary workflow).
- Alembic is the only migration owner.
- Shared UI primitives live in `packages/ui-kit`.
- App-specific UI lives inside each app.
- Shared Supabase/auth clients live in `packages/data`.

## Skills
Local skills are installed at `.agents/skills` and declared in `skills-lock.json`.

Primary skills to use in this repo:
- `turborepo`
- `next-best-practices`
- `tailwind-v4-shadcn`
- `vercel-react-best-practices`
- `supabase-postgres-best-practices`
- `fastapi-clean-architecture`
- `testing-monorepo`
- `monorepo-ci-standards`

## Anti-patterns
- Never duplicate shared UI components in app-level `ui` folders.
- Never run `supabase db push`; use Alembic migrations.
- Never expose Supabase service role credentials to frontend runtime.
- Never merge packages that do not provide `build/lint/test/typecheck` scripts.
