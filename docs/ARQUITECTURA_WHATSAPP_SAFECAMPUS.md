# Arquitectura WhatsApp / Omnicanal SafeCampus

## Objetivo

Documentar el estado actual de la integracion WhatsApp en SafeCampus y las reglas
de arquitectura para mantener el modulo operativo, trazable y preparado para la
clasificacion IA.

## Estado actual

La integracion local usa EvolutionAPI como proveedor de WhatsApp para desarrollo.
El frontend no se conecta directamente a EvolutionAPI; siempre pasa por el backend
FastAPI.

Flujo actual:

```txt
WhatsApp
  -> EvolutionAPI
  -> POST /api/v1/omnicanal/webhooks/whatsapp
  -> sc_omnicanal.reporte_entrante
  -> sc_omnicanal.conversacion
  -> sc_omnicanal.mensaje_conversacion
  -> sc_omnicanal.evento_conversacion
  -> WebSocket /api/v1/omnicanal/ws
  -> apps/web /mensajes
```

## Responsabilidades por capa

### EvolutionAPI

- Mantiene la sesion WhatsApp local.
- Emite webhooks al backend.
- Permite enviar respuestas desde SafeCampus hacia WhatsApp.
- Guarda su propio historial local, pero no es la fuente de verdad de la bandeja.

### Backend FastAPI

- Recibe y valida webhooks.
- Normaliza payloads de proveedor.
- Persiste reporte tecnico, conversacion, mensajes y eventos.
- Expone endpoints REST para la bandeja.
- Emite eventos WebSocket para realtime sin polling.
- Protege la bandeja para roles `administrador` y `supervisor`.

### Base de datos

Tablas operativas principales:

- `sc_omnicanal.reporte_entrante`: payload tecnico de entrada y auditoria.
- `sc_omnicanal.conversacion`: estado operativo, asignacion, modo, prioridad.
- `sc_omnicanal.mensaje_conversacion`: historial visible del chat.
- `sc_omnicanal.evento_conversacion`: trazabilidad de acciones.
- `sc_incidentes.incidente`: caso vinculado o creado desde la conversacion.

### Frontend web

- Ruta: `apps/web/src/app/(operativo)/mensajes`.
- Feature: `apps/web/src/features/whatsapp`.
- Consume solo el backend SafeCampus.
- Usa WebSocket para refrescar conversaciones y mensajes.
- Permite tomar, asignar, pasar a bot/humano, responder, cerrar y reabrir.

## Reglas de implementacion

- No exponer claves de EvolutionAPI o Supabase service role al frontend.
- No consultar Supabase directamente desde la bandeja operativa.
- No usar polling para realtime del inbox; usar WebSocket.
- Toda accion operativa debe registrar `evento_conversacion`.
- Alembic es el unico owner de cambios de esquema.
- Despues de migraciones, ejecutar `pnpm gen:types` y `pnpm db:model-coverage`.
- Mantener `docs/EVOLUTION_API_LOCAL.md` sincronizado con cualquier cambio de
  EvolutionAPI, webhooks o puertos.

## Diseño operativo

La bandeja no debe comportarse como un chat personal. Debe priorizar:

- severidad y SLA,
- estado de atencion,
- modo `BOT`/`HUMANO`,
- trazabilidad de operador,
- vinculacion con incidentes,
- preparacion para clasificacion IA.

Los mensajes deben distinguir autor:

- `CONTACTO`
- `BOT`
- `OPERADOR`
- `SISTEMA`

## Integracion IA prevista

La UI ya reserva una seccion de clasificacion IA con:

- categoria sugerida,
- severidad,
- confidence score,
- `requires_human_review`.

La fuente futura debe vivir en backend y persistirse en el dominio omnicanal o de
clasificacion, no calcularse solo en frontend. El proveedor inicial puede ser
Gemini y posteriormente OpenAI u otro adaptador, siempre detras de un servicio
interno del backend.

## Limitaciones conocidas

- Si EvolutionAPI o el backend estan apagados, SafeCampus no garantiza recibir
  los webhooks de ese periodo.
- Para produccion, EvolutionAPI debe ejecutarse en infraestructura estable con
  webhook publico hacia el backend.
- Se recomienda implementar un job de reconciliacion para recuperar mensajes
  recientes desde EvolutionAPI cuando exista un hueco operativo.

## Roadmap recomendado

1. Clasificacion IA real sobre mensajes entrantes.
2. Creacion/vinculacion de incidentes desde la conversacion.
3. KPIs de SLA, primera respuesta, saturacion de operadores y bot containment.
4. Job de reconciliacion de historial.
5. Adaptador Meta WhatsApp Cloud API cuando existan credenciales oficiales.
