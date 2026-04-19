# SafeCampus Web (`apps/web`)

Aplicacion web/pwa de SafeCampus basada en Next.js 16 (App Router).

## Antes de arrancar

1. Sigue primero el onboarding del monorepo en `README.md` (raiz).
2. Asegura que `apps/web/.env.local` este completo.
3. Si la web consume backend, levanta tambien `pnpm dev:backend` en paralelo.

## Comandos

Desde la raiz del monorepo:

```bash
pnpm dev:web
pnpm --filter @safecampus/web lint
pnpm --filter @safecampus/web typecheck
pnpm --filter @safecampus/web test
pnpm --filter @safecampus/web test:e2e
pnpm --filter @safecampus/web build
```

Si prefieres correrlos dentro de `apps/web`:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Rutas actuales

- Auth: `/login`
- Comunidad: `/reportar`, `/mis-casos`, `/lost-found`, `/acompanamiento`
- Operativo: `/dashboard`, `/incidentes`, `/mapa`, `/kpis`, `/mensajes`
- Admin: `/usuarios`, `/roles`, `/integraciones`, `/auditoria`

## Convenciones

- Reusar componentes de `@safecampus/ui-kit` (no duplicar `ui` local).
- Reusar tipos de `@safecampus/shared-types`.
- Mantener tipado y cliente Supabase en `@safecampus/data`.
