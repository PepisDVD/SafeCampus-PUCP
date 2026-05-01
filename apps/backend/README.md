# SafeCampus Backend

FastAPI backend for SafeCampus PUCP.

The backend owns authentication, authorization, database migrations, and all server-side access to the multi-schema Supabase/Postgres database.

## Stack

- Python 3.12
- FastAPI
- SQLAlchemy 2 async
- Alembic
- PostgreSQL/PostGIS on remote Supabase
- Pydantic v2
- Pytest

## Local Setup

From repo root:

```bash
cd apps/backend
python -m venv .venv
```

Activate the environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install --upgrade pip
pip install -e ".[dev]"
```

Return to repo root before using pnpm scripts:

```bash
cd ../..
```

## Environment

Create:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Required values:

```env
DATABASE_URL=postgresql+asyncpg://.../postgres?ssl=require
SECRET_KEY=CHANGE-ME
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=...
ALLOWED_INSTITUTIONAL_DOMAIN=pucp.edu.pe
WEB_APP_URL=http://localhost:3000
BACKEND_PUBLIC_URL=http://localhost:8000
SESSION_COOKIE_NAME=safecampus_session
SESSION_COOKIE_SECURE=false
```

`DATABASE_URL` must use the async SQLAlchemy driver prefix:

```text
postgresql+asyncpg://
```

and must require SSL:

```text
?ssl=require
```

## Authentication

Authentication is backend-owned.

Apps must not call Supabase OAuth directly. Web/mobile should call or redirect to the backend endpoints:

```text
GET  /api/v1/auth/google/login
GET  /api/v1/auth/google/callback
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

Flow:

1. App redirects to `/api/v1/auth/google/login?email=...&next=...`.
2. Backend starts Google OAuth through Supabase.
3. Supabase redirects to `/api/v1/auth/google/callback`.
4. Backend exchanges the OAuth code, syncs `sc_users.usuario`, resolves roles, and sets an HTTP-only `safecampus_session` cookie.
5. Apps use `/api/v1/auth/me` for session/profile checks.
6. Protected backend routes use dependencies in `app/api/deps.py`.

Supabase Auth must allow this redirect URL:

```text
http://localhost:8000/api/v1/auth/google/callback
```

If query matching is strict, also allow:

```text
http://localhost:8000/api/v1/auth/google/callback**
```

## Architecture

Use this flow:

```text
models -> repositories -> services -> api/v1
```

Responsibilities:

- `app/models`: SQLAlchemy models grouped by database schema.
- `app/repositories`: database access only.
- `app/services`: business rules and orchestration.
- `app/api/v1`: FastAPI routers, request dependencies, response contracts.
- `app/schemas`: Pydantic request/response schemas.
- `app/core`: config, database engine, security helpers.

Do not place SQL or business rules directly in route handlers.

## Database Models

The Supabase/Postgres database is split across schemas:

- `sc_users`
- `sc_omnicanal`
- `sc_incidentes`
- `sc_clasificacion`
- `sc_notificaciones`
- `sc_dashboard`
- `sc_lost_found`
- `sc_acompanamiento`
- `sc_auditoria`

Backend SQLAlchemy models are grouped by schema:

```text
app/models/sc_users.py
app/models/sc_omnicanal.py
app/models/sc_incidentes.py
app/models/sc_clasificacion.py
app/models/sc_notificaciones.py
app/models/sc_dashboard.py
app/models/sc_lost_found.py
app/models/sc_acompanamiento.py
app/models/sc_auditoria.py
```

Each model must declare its schema:

```python
class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = {"schema": "sc_users"}
```

All model modules must be imported from `app/models/__init__.py`; otherwise `Base.metadata` will not see them.

## Migrations

Alembic is the only migration owner.

Do not use:

```bash
supabase db push
```

Use:

```bash
pnpm db:migrate
pnpm db:current
pnpm db:history
```

To create a migration:

```bash
pnpm db:makemigrations
```

Review generated migrations before applying them. This project uses remote Supabase as the primary database.

## Model Coverage

After schema changes, verify backend model coverage:

```bash
pnpm db:model-coverage
```

Expected healthy output:

```text
Database tables: 31
Modeled tables:  31
Missing models:  0
Extra models:    0
```

If tables are missing:

1. Add or update the corresponding model in `app/models/sc_*.py`.
2. Export it from `app/models/__init__.py`.
3. Refactor repositories to use the model instead of raw table strings.
4. Run `pnpm db:model-coverage` again.

Do not create a hand-written Python equivalent of `packages/shared-types/src/database.types.ts`. The backend source of database context is SQLAlchemy models plus Pydantic API schemas.

## Maintenance Workflow

When the database changes:

```bash
pnpm db:migrate
pnpm gen:types
pnpm db:model-coverage
pnpm test:backend
```

When frontend API contracts also changed:

```bash
pnpm --filter @safecampus/web typecheck
```

## Development

Run the backend:

```bash
pnpm dev:backend
```

Useful URLs:

```text
http://localhost:8000/health
http://localhost:8000/api/v1/docs
```

Run tests:

```bash
pnpm test:backend
```

## Common Issues

### Alembic cannot locate a revision

The remote database may reference a migration file missing locally. Restore the missing revision from Git history or the branch that introduced it. Do not edit `alembic_version` manually unless you are deliberately repairing migration history and understand the DB state.

### Windows timeout during migration

Errors like `WinError 121` or `connection was closed in the middle of operation` can be transient network/Supabase pooler issues. Check:

```bash
pnpm db:current
```

If the DB is already at `head`, rerun:

```bash
pnpm db:migrate
```

### OAuth returns `bad_oauth_state`

Confirm Supabase Auth redirect URLs include the backend callback URL, not the frontend callback.
