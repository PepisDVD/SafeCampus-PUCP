# Comunicacion y notificaciones de incidentes PWA

## Objetivo

Se implemento el modulo base de comunicacion y notificaciones internas para la gestion de incidentes en la PWA, cubriendo los perfiles de comunidad y supervisor/operativo. La solucion queda preparada para sumar app movil, operador y canales push en una etapa posterior.

## Criterios arquitectonicos respetados

- La PWA no se conecta directamente a la base de datos.
- La web consume datos mediante endpoints FastAPI bajo `/api/v1`.
- La capa backend mantiene el flujo `schemas -> repositories -> services -> api/v1`.
- Los contratos reutilizables se ubicaron en `packages/shared-types`.
- Los componentes exclusivos de la experiencia web/PWA se ubicaron en `apps/web/src/features`.
- Se reutilizaron tablas existentes del modelo: `sc_incidentes.comentario_incidente`, `sc_incidentes.historial_incidente` y `sc_notificaciones.notificacion`.

## Backend

### Incidentes

Se extendio el modulo de incidentes para soportar comunicacion asociada al caso:

- `GET /api/v1/incidentes/mis/{incidente_ref}`
  - Devuelve el detalle de un incidente propio de comunidad.
  - Acepta UUID o codigo del incidente.
  - Incluye historial y comentarios visibles.

- `POST /api/v1/incidentes/{incidente_id}/comentarios`
  - Registra un mensaje asociado al incidente.
  - Permite notas internas solo para roles operativos.
  - Genera notificaciones internas a los destinatarios correspondientes.

Tambien se agrego generacion de notificaciones cuando:

- Comunidad registra un nuevo incidente.
- Supervisor cambia el estado del incidente.
- Supervisor asigna un responsable.
- Comunidad o supervisor envia un mensaje visible.

### Notificaciones

Se creo el modulo backend de notificaciones internas:

- `GET /api/v1/notificaciones`
  - Lista notificaciones INAPP del usuario autenticado.

- `GET /api/v1/notificaciones/no-leidas`
  - Devuelve el contador de notificaciones no leidas.

- `PATCH /api/v1/notificaciones/{id}/leer`
  - Marca una notificacion como leida.

- `PATCH /api/v1/notificaciones/leer-todas`
  - Marca todas las notificaciones INAPP del usuario como leidas.

Archivos principales:

- `apps/backend/app/schemas/notificacion.py`
- `apps/backend/app/repositories/notificacion_repository.py`
- `apps/backend/app/services/notificacion_service.py`
- `apps/backend/app/api/v1/notificaciones.py`
- `apps/backend/app/api/v1/router.py`

## Contratos compartidos

Se agregaron tipos compartidos para que web y futura app movil usen el mismo contrato:

- `ComentarioIncidenteItem`
- `ComentarioIncidenteCreateInput`
- `NotificacionItem`
- `NotificacionListResponse`
- `NotificacionUnreadCount`
- `CanalNotificacion`
- `EstadoNotificacion`

Archivos principales:

- `packages/shared-types/src/incidente.ts`
- `packages/shared-types/src/notificacion.ts`
- `packages/shared-types/src/enums.ts`
- `packages/shared-types/src/index.ts`

## Web / PWA

### Comunidad

Se agrego:

- Centro de notificaciones en `/notificaciones`.
- Contador de no leidas en la navegacion inferior.
- Detalle de caso propio en `/mis-casos/[id]`.
- Trazabilidad del incidente.
- Mensajeria asociada al caso.

Archivos principales:

- `apps/web/src/app/(comunidad)/notificaciones/page.tsx`
- `apps/web/src/app/(comunidad)/mis-casos/[id]/page.tsx`
- `apps/web/src/app/(comunidad)/_components/comunidad-shell.tsx`

### Supervisor / Operativo

Se agrego:

- Centro operativo de notificaciones en `/mensajes`.
- Contador de no leidas en el header operativo.
- Panel de comunicacion dentro del detalle del incidente.
- Soporte de notas internas para equipo operativo.

Archivos principales:

- `apps/web/src/app/(operativo)/mensajes/page.tsx`
- `apps/web/src/app/(operativo)/incidentes/[id]/page.tsx`
- `apps/web/src/app/(operativo)/_components/operativo-shell.tsx`

### Features web

Se agregaron clientes y componentes app-specific:

- `apps/web/src/features/incidentes/components/incidente-comunicacion.tsx`
- `apps/web/src/features/notificaciones/service.ts`
- `apps/web/src/features/notificaciones/client.ts`
- `apps/web/src/features/notificaciones/components/notificaciones-client.tsx`
- `apps/web/src/features/notificaciones/components/notification-badge.tsx`

## Pruebas y validacion

Se agregaron pruebas backend para el API de notificaciones:

- `apps/backend/tests/test_api/test_notificaciones.py`

Validaciones ejecutadas:

- `corepack pnpm --filter @safecampus/web typecheck`
- `corepack pnpm --filter @safecampus/web lint`
- `corepack pnpm test:backend`
- Validacion sintactica Python con `ast.parse`

Resultado:

- Typecheck web: OK.
- Lint web: OK, con 1 warning existente en `official-logo-mark.tsx` por uso de `<img>`.
- Tests backend: OK, 6 pruebas pasadas.

## Pendiente para futuras etapas

- Web Push con permisos del navegador.
- Preferencias de notificacion por usuario.
- Suscripciones push para app movil.
- Flujo completo de operador cuando se implemente la app movil.
- Realtime con WebSocket/Supabase Realtime si se requiere entrega inmediata sin polling.
