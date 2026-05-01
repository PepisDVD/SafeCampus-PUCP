# Backend Schema Tooling

## Model Coverage

Run this after a database migration or manual Supabase schema update:

```bash
pnpm db:model-coverage
```

It compares remote Postgres tables in the SafeCampus schemas against SQLAlchemy
models registered in `app.models`.

Expected workflow:

1. Apply Alembic migrations or update the remote schema.
2. Run `pnpm gen:types` for frontend/shared Supabase types.
3. Run `pnpm db:model-coverage` for backend SQLAlchemy coverage.
4. Add or update curated models in `apps/backend/app/models/sc_*.py`.
5. Refactor repositories to use those models instead of raw table strings.

Do not auto-overwrite curated ORM models. Generated/introspected output should
be treated as a review aid, then promoted manually into schema-specific model
files.
