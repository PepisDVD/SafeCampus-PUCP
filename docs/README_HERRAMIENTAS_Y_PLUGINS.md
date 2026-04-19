# Herramientas, Extensiones y Plugins del Monorepo (SafeCampus)

Fecha de referencia: **2026-04-19**

Este documento resume el tooling instalado/configurado en el repo para que nuevos miembros entiendan rapido que ya viene listo y para que sirve.

## 1) Tooling base del monorepo

| Herramienta | Donde se configura | Uso en SafeCampus |
|---|---|---|
| `pnpm` workspaces | `pnpm-workspace.yaml`, `package.json` raiz | Gestion de dependencias y workspaces (`apps/*`, `packages/*`, `infra/*`) |
| `Turborepo` | `turbo.json`, scripts raiz | Orquestacion de `build/lint/test/typecheck/dev` por paquete |
| `Node.js >= 20` | `package.json` raiz (`engines`) | Runtime JS/TS para web, mobile y tooling infra |
| `Python >= 3.12` | `apps/backend/pyproject.toml` | Runtime backend FastAPI |
| `Scoop` (Windows) | Instalacion local del entorno | Gestor recomendado para instalar CLIs del monorepo |
| `Supabase CLI >= 2` | `infra/supabase`, comandos raiz (`pnpm gen:types`) | Generacion de tipos y utilidades de proyecto Supabase |

### Instalacion recomendada en Windows (bootstrap)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Validacion:

```powershell
scoop --version
supabase --version
```

## 2) Frontend web/mobile

| Herramienta | Ubicacion | Detalle |
|---|---|---|
| Next.js 16 + React 19 | `apps/web/package.json` | App web/pwa con App Router |
| Tailwind CSS v4 | `apps/web`, `packages/config/tailwind` | Estilos y tokens compartidos |
| shadcn + Radix UI | `packages/ui-kit` | Componentes UI reutilizables en apps |
| Expo (mobile) | `apps/mobile/package.json` | Base de app React Native |

## 3) Backend e infraestructura de datos

| Herramienta | Ubicacion | Detalle |
|---|---|---|
| FastAPI | `apps/backend` | API principal |
| SQLAlchemy async | `apps/backend/app/core/database.py` | Capa ORM async |
| Alembic | `apps/backend/alembic` | Migraciones de schema |
| Supabase JS/SSR | `packages/data` | Cliente tipado browser/server |
| Supabase CLI | `infra/supabase/package.json` | Generacion de tipos TS (`pnpm gen:types`) |
| Docker Compose (auxiliar) | `infra/docker/docker-compose.dev.yml` | Servicios locales: Redis y Mailpit |

## 4) Calidad y testing

| Herramienta | Ubicacion | Detalle |
|---|---|---|
| ESLint | `apps/web/eslint.config.mjs`, `packages/config/eslint/*` | Linting TS/React |
| TypeScript | `tsconfig` en apps/packages | Typecheck en web/mobile/packages |
| Vitest | `apps/web/vitest.config.ts` | Tests unitarios frontend |
| Playwright | `apps/web/playwright.config.ts` | E2E web |
| Pytest | `apps/backend/tests` | Tests backend |

## 5) CI/CD

| Herramienta | Ubicacion | Detalle |
|---|---|---|
| GitHub Actions | `.github/workflows/ci.yml` | Jobs para lint/test/typecheck/build y tests backend |

## 6) Plugins/skills para agentes (IA de desarrollo)

El repo trae skills locales para asistentes de codigo:

- Directorio: `.agents/skills`
- Registro: `skills-lock.json`

Skills detectados:

1. `turborepo`
2. `next-best-practices`
3. `tailwind-v4-shadcn`
4. `vercel-react-best-practices`
5. `supabase-postgres-best-practices`
6. `fastapi-clean-architecture`
7. `testing-monorepo`
8. `monorepo-ci-standards`

## 7) Extensiones de IDE

No se detecto un archivo versionado de recomendaciones de VS Code (`.vscode/extensions.json`).

Implica que:

- No hay un set oficial de extensiones IDE forzado por el repo.
- Las herramientas estandar se gestionan por scripts del monorepo, no por configuracion de editor.

## 8) Comandos rapidos por categoria

### Monorepo

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Backend

```bash
pnpm dev:backend
pnpm test:backend
pnpm db:migrate
pnpm db:current
```

### Web

```bash
pnpm dev:web
pnpm --filter @safecampus/web test:e2e
```

### Infra auxiliar

```bash
pnpm dev:deps:up
pnpm dev:deps:down
pnpm gen:types
```
