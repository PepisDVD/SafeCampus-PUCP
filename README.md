# SafeCampus PUCP

Monorepo para la plataforma omnicanal de gestion de incidentes en campus PUCP.

## Estado actual

- `apps/web`: Next.js 16 con login/reportar/dashboard funcionales y UI-kit compartido.
- `apps/backend`: FastAPI base + vertical inicial de incidentes (`api -> service -> repository`).
- `apps/mobile`: skeleton Expo integrado al monorepo.
- `packages/data`: capa de acceso Supabase (browser/server/proxy refresh session).
- `packages/shared-types`: source of truth de tipos de dominio + `Database`.
- Base de datos: Supabase remoto (sin Postgres local en Docker).

## Estructura

| Ruta | Uso |
|---|---|
| `apps/backend` | API FastAPI + Alembic |
| `apps/web` | Web/PWA (App Router) |
| `apps/mobile` | App operador (Expo) |
| `packages/ui-kit` | Componentes compartidos |
| `packages/shared-types` | Tipos compartidos |
| `packages/data` | Cliente Supabase y utilidades SSR/proxy |
| `infra/supabase` | Tooling de tipos Supabase |
| `infra/docker` | Servicios auxiliares (`redis`, `mailpit`) |
| `repo-safeCampus-UI-Base-Figma` | Referencia visual en solo lectura |

## Requisitos

- Node.js >= 20
- pnpm >= 9
- Python >= 3.12

## Variables de entorno

### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_DOMAIN=
```

### Backend (`apps/backend/.env`)

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/postgres?ssl=require
SECRET_KEY=CHANGE-ME
```

## Comandos principales

```bash
pnpm dev:web
pnpm dev:backend
pnpm dev:mobile
pnpm dev:deps:up
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm gen:types
```

## Supabase y migraciones

- Migraciones: se gestionan desde backend (`alembic`).
- Tipos TS: `pnpm gen:types` desde `infra/supabase` hacia `packages/shared-types`.
