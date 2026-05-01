# SafeCampus PUCP

Monorepo de SafeCampus PUCP para web, backend y mobile.

Fecha de referencia de este estado: **2026-05-01**.

## 1) Estado actual del monorepo

- `apps/web`: Next.js 16 + React 19. Login, reportar, dashboard operativo y modulos admin con UI funcional.
- `apps/backend`: FastAPI con arquitectura en capas (`models -> repositories -> services -> api/v1`), auth centralizada, Alembic y modelos SQLAlchemy por esquema.
- `apps/mobile`: skeleton Expo integrado al monorepo.
- `packages/data`: clientes Supabase compartidos para casos puntuales de datos/tipos. La autenticacion de apps no debe iniciarse desde frontend.
- `packages/shared-types`: tipos de dominio compartidos (`Incidente`, `Usuario`, enums).
- Base de datos: **Supabase remoto** (no se levanta Postgres local en Docker para SafeCampus).

## 2) Estructura principal

| Ruta | Uso |
|---|---|
| `apps/backend` | API FastAPI, Alembic, tests Pytest |
| `apps/web` | App web/pwa con Next.js App Router |
| `apps/mobile` | App Expo (base) |
| `packages/ui-kit` | Componentes UI compartidos (shadcn/Radix) |
| `packages/shared-types` | Tipos de dominio + `Database` |
| `packages/data` | Cliente Supabase y utilidades compartidas |
| `packages/config` | ESLint/TSConfig/Prettier compartidos |
| `infra/db` | SQL base (DDL y bootstrap) |
| `infra/supabase` | CLI/scripts para generar tipos TS desde Supabase |
| `infra/docker` | Servicios auxiliares locales (`redis`, `mailpit`) |
| `docs` | Documentacion tecnica |

## 3) Onboarding completo (desde cero)

Esta seccion asume que acabas de clonar el repo.

### Paso 0. Requisitos

- Node.js `>=20`
- pnpm `>=9`
- Python `>=3.12`
- Scoop (Windows, para gestionar instalaciones CLI)
- Supabase CLI `>=2` (necesario para flujo `pnpm gen:types`)
- Docker Desktop (opcional, solo para deps auxiliares)

Verifica rapido:

```bash
node -v
pnpm -v
python --version
scoop --version
supabase --version
docker --version
```

### Paso 0.1 (Windows) Instalar Scoop y Supabase CLI

Si estas en Windows y aun no los tienes instalados:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Validar instalacion:

```powershell
scoop --version
supabase --version
```

### Paso 1. Clonar e instalar dependencias JS

```bash
git clone <URL_DEL_REPO>
cd Repo-SafeCampus-PUCP
pnpm install
```

### Paso 2. Preparar entorno Python del backend

Desde `apps/backend`:

```bash
cd apps/backend
python -m venv .venv
```

Activacion:

- PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

- Bash:

```bash
source .venv/bin/activate
```

Instalar dependencias backend:

```bash
pip install --upgrade pip
pip install -e ".[dev]"
cd ../..
```

### Paso 3. Configurar variables de entorno

#### 3.1 Variables globales (`.env` en raiz)

```bash
cp .env.example .env
```

Completar al menos:

- `DATABASE_URL` (DSN `postgresql+asyncpg://...` con `?ssl=require`)
- `SUPABASE_PROJECT_ID` (opcional si ya tienes `NEXT_PUBLIC_SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SCHEMAS` (por defecto incluye `public` y todos los esquemas `sc_*`)
- `SUPABASE_ACCESS_TOKEN` (recomendado para `pnpm gen:types`)
- `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:8000/api/v1`)

#### 3.2 Variables backend (`apps/backend/.env`)

```bash
cp apps/backend/.env.example apps/backend/.env
```

Completar como minimo:

- `DATABASE_URL`
- `SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_INSTITUTIONAL_DOMAIN`
- `WEB_APP_URL` (local: `http://localhost:3000`)
- `BACKEND_PUBLIC_URL` (local: `http://localhost:8000`)
- `SESSION_COOKIE_NAME` (por defecto `safecampus_session`)

#### 3.3 Variables web (`apps/web/.env.local`)

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Completar o validar:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
BACKEND_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_DOMAIN=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

`BACKEND_URL` es server-only para proxy, Server Components y Server Actions de Next.js. Puede coincidir con `NEXT_PUBLIC_API_URL` en local.

La web no debe iniciar OAuth directamente contra Supabase. El login redirige al backend:

```text
GET http://localhost:8000/api/v1/auth/google/login
GET http://localhost:8000/api/v1/auth/google/callback
GET http://localhost:8000/api/v1/auth/me
POST http://localhost:8000/api/v1/auth/logout
```

En Supabase Auth, agrega como Redirect URL permitida:

```text
http://localhost:8000/api/v1/auth/google/callback
```

Si Supabase exige patron con query string, agrega tambien:

```text
http://localhost:8000/api/v1/auth/google/callback**
```

### Paso 4. Sincronizar base de datos (Supabase remoto)

SafeCampus usa Supabase remoto. Flujo recomendado:

1. Si es proyecto nuevo, ejecutar una vez `infra/db/initial_DLL.sql` en SQL Editor de Supabase.
2. Aplicar migraciones Alembic:

```bash
pnpm db:migrate
pnpm db:current
pnpm db:history
```

3. Autenticar Supabase CLI (obligatorio para generar tipos):

```bash
supabase login
```

Si prefieres usar el binario local del monorepo:

```bash
pnpm supabase:login
```

Alternativa no interactiva (CI/entornos sin TTY): definir `SUPABASE_ACCESS_TOKEN` en `.env` raiz.

4. Regenerar tipos TS de Supabase:

```bash
pnpm gen:types
```

Esto escribe en `packages/shared-types/src/database.types.ts`.

5. Verificar cobertura de modelos SQLAlchemy del backend:

```bash
pnpm db:model-coverage
```

Este comando compara las tablas reales de los esquemas `sc_*` contra los modelos registrados en `apps/backend/app/models`. Debe terminar con:

```text
Missing models: 0
Extra models:    0
```

Si la BD cambia, agrega o actualiza modelos en `apps/backend/app/models/sc_*.py`; no generes un archivo gigante tipo `database.types.py`.

### Paso 5. Levantar servicios auxiliares (opcional)

```bash
pnpm dev:deps:up
```

Servicios:

- Redis: `localhost:6379`
- Mailpit SMTP/UI: `localhost:1025` y `http://localhost:8025`

Apagar:

```bash
pnpm dev:deps:down
```

### Paso 6. Levantar aplicaciones

En terminales separadas:

```bash
pnpm dev:backend
pnpm dev:web
```

Opcional mobile:

```bash
pnpm dev:mobile
```

URLs utiles:

- Backend health: `http://localhost:8000/health`
- Backend docs: `http://localhost:8000/api/v1/docs`
- Web: `http://localhost:3000`

### Paso 7. Validar calidad local

```bash
pnpm lint
pnpm typecheck
pnpm test:backend
pnpm test
pnpm build
```

Nota: en algunos entornos Windows se puede presentar `Error: spawn EPERM` al correr `pnpm test`/`pnpm build` del paquete web (Vitest/Next). Si ocurre, validar primero `pnpm lint`, `pnpm typecheck` y `pnpm test:backend`.

## 4) Comandos principales del monorepo

```bash
pnpm dev:web
pnpm dev:backend
pnpm dev:mobile
pnpm dev:deps:up
pnpm dev:deps:down
pnpm lint
pnpm typecheck
pnpm test
pnpm test:backend
pnpm build
pnpm db:migrate
pnpm db:makemigrations
pnpm db:current
pnpm db:history
pnpm db:model-coverage
pnpm gen:types
pnpm supabase:login
```

## 5) Convenciones importantes

- Alembic es el dueno de migraciones (`apps/backend/alembic`).
- No usar `supabase db push` para SafeCampus.
- Supabase es remoto. No se levanta una BD local como fuente principal.
- La autenticacion Google/Supabase es responsabilidad del backend. Frontend y mobile deben llamar/redirigir al backend.
- El backend mantiene modelos SQLAlchemy por esquema en `apps/backend/app/models/sc_*.py`.
- Despues de cambiar la BD: `pnpm db:migrate`, `pnpm gen:types`, `pnpm db:model-coverage`.
- Reusar `@safecampus/ui-kit` y `@safecampus/shared-types` en apps.
- `infra/docker` no levanta Postgres local para SafeCampus.

## 6) Documentacion complementaria

- Estructura del repo: `docs/ESTRUCTURA.md`
- Tokens de diseno: `docs/DESIGN_TOKENS.md`
- Herramientas/plugins del monorepo: `docs/README_HERRAMIENTAS_Y_PLUGINS.md`
- Backend: `apps/backend/README.md`
