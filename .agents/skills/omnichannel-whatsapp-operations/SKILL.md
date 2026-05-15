---
name: omnichannel-whatsapp-operations
description: SafeCampus WhatsApp/EvolutionAPI omnichannel operations. Use when implementing, debugging, or documenting WhatsApp webhooks, EvolutionAPI local stack, sc_omnicanal conversations/messages/events, realtime WebSocket inbox, or the /mensajes operational console.
---

# Omnichannel WhatsApp Operations

Use this skill for SafeCampus work that touches WhatsApp, EvolutionAPI,
`sc_omnicanal`, realtime inbox behavior, or the `/mensajes` web module.

## Current Architecture

Keep this flow intact:

```txt
WhatsApp -> EvolutionAPI -> FastAPI webhook
  -> sc_omnicanal.reporte_entrante
  -> sc_omnicanal.conversacion
  -> sc_omnicanal.mensaje_conversacion
  -> sc_omnicanal.evento_conversacion
  -> WebSocket /api/v1/omnicanal/ws
  -> apps/web /mensajes
```

The frontend must consume SafeCampus backend endpoints only. Do not call
EvolutionAPI or Supabase directly from the inbox UI.

## Backend Workflow

Follow the FastAPI layered path:

1. Models in `apps/backend/app/models/sc_omnicanal.py`.
2. Repository methods in `apps/backend/app/repositories/omnicanal_repository.py`.
3. Business rules in `apps/backend/app/services/omnicanal_service.py`.
4. Routes in `apps/backend/app/api/v1/omnicanal.py`.
5. Realtime broadcast through `apps/backend/app/services/omnicanal_realtime.py`.

For schema changes:

1. Add Alembic migration under `apps/backend/alembic/versions`.
2. Run `pnpm db:migrate`.
3. Run `pnpm gen:types`.
4. Run `pnpm db:model-coverage`.

Never use `supabase db push`.

## Frontend Workflow

The inbox lives in:

```txt
apps/web/src/app/(operativo)/mensajes
apps/web/src/features/whatsapp
```

Use `@safecampus/ui-kit` primitives and Tailwind v4 utilities. Keep
domain-specific components inside `apps/web/src/features/whatsapp` unless they
are truly reusable across modules.

Realtime must use WebSocket, not polling. Normalize configured WebSocket URLs so
local values like `ws://localhost:8000`, `ws://localhost:8000/ws`, or a full
endpoint resolve to:

```txt
ws://localhost:8000/api/v1/omnicanal/ws
```

## Operational Actions

Every operator action should persist an event in `evento_conversacion`.

Supported actions:

- tomar chat,
- asignar operador,
- activar bot,
- pasar a humano,
- enviar mensaje,
- cerrar chat,
- reabrir chat,
- vincular o crear incidente.

Protect operational endpoints with roles `administrador` and `supervisor`.

## EvolutionAPI Local Stack

Relevant files:

```txt
infra/docker/evolution/docker-compose.yml
infra/docker/evolution/.env.example
infra/docker/evolution/nginx-manager-proxy.conf.template
docs/EVOLUTION_API_LOCAL.md
```

Ports:

- EvolutionAPI API: `http://localhost:8080`
- Evolution Manager proxy: `http://localhost:8081/manager`
- SafeCampus backend: `http://localhost:8000`
- SafeCampus web: `http://localhost:3000`

Use `host.docker.internal` in EvolutionAPI webhook config when the backend runs
on the host:

```txt
http://host.docker.internal:8000/api/v1/omnicanal/webhooks/whatsapp
```

Keep `docs/EVOLUTION_API_LOCAL.md` updated whenever ports, env vars, webhook
events, or Manager behavior change.

## Verification

Prefer these checks before PR:

```powershell
pnpm db:current
pnpm db:model-coverage
pnpm test:backend
pnpm typecheck
pnpm lint
```

If env templates changed, verify local env keys against templates without
printing secrets.
