# Implementacion del Chatbot Operativo de WhatsApp

Este documento describe la capa conversacional integrada sobre omnicanal. Complementa la documentacion del modulo LLM y se centra en la orquestacion del chatbot conectado a la bandeja operativa.

## Objetivo

Permitir que WhatsApp tenga como primer respondedor al chatbot, con estas reglas:

- Responde primero en casos de baja y media complejidad.
- Solicita datos faltantes para completar el registro.
- Crea incidente automaticamente cuando ya tiene informacion suficiente.
- Deriva inmediatamente a humano en casos criticos, urgentes o ambiguos.

## Piezas implementadas

- `apps/backend/app/services/chatbot_service.py`
  Orquesta clasificacion, memoria corta, politica conversacional, envio del bot y derivacion.

- `apps/backend/app/models/sc_omnicanal.py`
  Agrega `ChatbotEstadoConversacion` para persistir estado del bot, resumen, borrador y handoff.

- `apps/backend/app/repositories/omnicanal_repository.py`
  Expone lectura/escritura del estado del chatbot y proyecta esa informacion al API de omnicanal.

- `apps/backend/app/services/omnicanal_service.py`
  Conecta el webhook de mensajes entrantes con el chatbot y sincroniza el takeover humano.

- `apps/web/src/features/whatsapp/components/whatsapp-console.tsx`
  Renderiza el estado del chatbot, resumen operativo, derivacion y borrador de incidente.

## Persistencia

Se agrego la tabla `sc_omnicanal.chatbot_estado_conversacion` para no sobrecargar `metadatos` de `conversacion` con estado operativo estructurado.

Campos principales:

- `bot_status`
- `last_intent`
- `last_action`
- `requires_human_review`
- `handoff_reason`
- `ai_summary`
- `memory_snapshot`
- `incident_draft`
- `classification_category`
- `classification_severity`
- `classification_confidence`

## Flujo operativo actual

1. Entra mensaje por webhook de WhatsApp.
2. Se crea o actualiza `conversacion` y `mensaje_conversacion`.
3. Si el mensaje viene del contacto y la conversacion sigue en modo bot, se ejecuta `ChatbotService.process_incoming_contact_message()`.
4. El chatbot clasifica el caso con `LLMService`.
5. Decide una accion:
   - pedir detalle,
   - pedir ubicacion,
   - crear incidente,
   - derivar a humano.
6. Si corresponde, envia respuesta por Evolution API y persiste el mensaje como `autor_tipo=BOT`.
7. La bandeja operativa recibe el nuevo estado por el endpoint existente y por realtime.

## Variables necesarias

Configura en `apps/backend/.env`:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=tu_api_key_real
CHATBOT_ENABLED=true
CHATBOT_AUTO_CREATE_INCIDENTS=true
CHATBOT_SYSTEM_USER_ID=uuid-de-usuario-tecnico
```

### Donde conectar tu API key de Gemini

En `apps/backend/.env`:

```env
GEMINI_API_KEY=...
LLM_PROVIDER=gemini
```

Si quieres dejar OpenAI como clasificador principal y Gemini solo para otras funciones, usa:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

## Usuario tecnico del chatbot

`CHATBOT_SYSTEM_USER_ID` debe apuntar a un usuario real ya existente en `sc_users.usuario`.
Ese usuario se usa para `reportante_id` cuando el chatbot crea incidentes automaticamente. Sin ese UUID, el bot igual puede responder y derivar, pero no podra crear incidentes automaticamente.

## Migracion

La migracion agregada es:

- `apps/backend/alembic/versions/20260513_0008_chatbot_estado_conversacion.py`

Aplicacion esperada:

```bash
pnpm db:migrate
```

## Limites actuales

- La politica conversacional es deterministicamente gobernada por backend; no es un runtime de agente autonomo.
- La memoria actual es operativa y corta; no hay RAG ni memoria vectorial.
- El bot crea incidentes usando un usuario tecnico configurable.

Esta version deja el sistema listo para evolucionar luego a una arquitectura mas agent-ready sin rehacer la base operativa.