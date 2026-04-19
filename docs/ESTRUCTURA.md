# Estructura real del monorepo SafeCampus (abril 2026)

## Contenedores C4 -> carpetas

| Contenedor | Carpeta | Estado |
|---|---|---|
| Backend API | `apps/backend/` | Base funcional con FastAPI, health check y vertical inicial de incidentes |
| Frontend web/pwa | `apps/web/` | Next.js 16 con App Router y paginas principales migradas |
| Frontend mobile operador | `apps/mobile/` | Skeleton Expo inicial dentro del monorepo |
| Paquetes compartidos | `packages/*` | `ui-kit`, `shared-types`, `config`, `data` |
| Infraestructura | `infra/` | Supabase remoto + Docker solo para dependencias auxiliares |
| UI base de referencia | `repo-safeCampus-UI-Base-Figma/` | Solo referencia visual/fuente de migracion |

## Paquetes compartidos

| Paquete | Proposito |
|---|---|
| `@safecampus/ui-kit` | Componentes UI compartidos para apps del monorepo |
| `@safecampus/shared-types` | Tipos de dominio compartidos + `Database` de Supabase |
| `@safecampus/data` | Cliente Supabase browser/server, refresh de sesion para proxy y utilidades de query |
| `@safecampus/config` | Configuracion compartida de eslint/tsconfig/prettier/tokens |

## Backend actual

```
apps/backend/app/
  api/v1/
    incidentes.py
    router.py
  models/
    base.py
    incidente_view.py
  repositories/
    incidente_repository.py
  services/
    incidente_service.py
  schemas/
    common.py
    incidente.py
```

Notas:
- El dominio completo (todas las tablas/esquemas planeados) sigue pendiente de implementacion.
- Alembic y conexion a Supabase remoto estan activos.

## Frontend web actual

Rutas con UI funcional migrada:
- `/login`
- `/reportar`
- `/dashboard`

Rutas aun en modo base (pendientes de migracion completa desde la UI validada):
- `/mis-casos`
- `/lost-found`
- `/acompanamiento`
- `/incidentes`, `/mapa`, `/kpis`, `/mensajes`
- modulo admin

## Docker en SafeCampus

No se usa Postgres local.

`infra/docker/docker-compose.dev.yml` se usa solo para servicios auxiliares de desarrollo:
- `redis`: cache/pubsub/eventos
- `mailpit`: pruebas de correo saliente

Comandos recomendados:
- `pnpm dev:deps:up`
- `pnpm dev:deps:down`

## Estandares del monorepo

- Todos los workspaces JS tienen scripts base: `build`, `lint`, `test`, `typecheck`.
- Tipos de Supabase se generan hacia `packages/shared-types/src/database.types.ts`.
- Tipos de dominio se consumen desde `@safecampus/shared-types` (sin duplicarlos en apps).
