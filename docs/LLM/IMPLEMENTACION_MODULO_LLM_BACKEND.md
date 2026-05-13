# Implementacion del Modulo LLM en Backend

Este documento aterriza la especificacion funcional al codigo del monorepo. Se enfoca en donde vive cada pieza, como se conecta y que puntos quedan listos para la siguiente integracion con la bandeja WhatsApp.

## Estructura implementada

### Dominio y orquestacion

- `apps/backend/app/llm/schemas.py`
  - Contratos tipados para prompts, contexto de clasificacion, respuesta normalizada y resultado final.
- `apps/backend/app/llm/prompt_factory.py`
  - Repositorio y fabrica de prompts a partir de `registry.json` y archivos versionados.
- `apps/backend/app/llm/normalizer.py`
  - Parseo seguro, normalizacion de valores fuera de contrato y construccion de `DefaultClassification`.
- `apps/backend/app/llm/business_rules.py`
  - Reglas post-LLM para elevar severidad, activar revision humana y disparar notificacion.
- `apps/backend/app/llm/orchestrator.py`
  - Flujo completo: prompt activo -> proveedor -> retry/fallback -> normalizacion -> reglas.
- `apps/backend/app/llm/key_manager.py`
  - Lectura centralizada de credenciales y contabilizacion de consumo de tokens.

### Integraciones externas

- `apps/backend/app/integrations/llm/openai_client.py`
  - Cliente asincrono con SDK oficial `openai`.
- `apps/backend/app/integrations/llm/gemini_client.py`
  - Cliente asincrono via REST con `httpx` para Gemini.
- `apps/backend/app/integrations/llm/exceptions.py`
  - Excepciones desacopladas del proveedor.

### Aplicacion y persistencia

- `apps/backend/app/services/llm_service.py`
  - Fachada para clasificar contextos generales o mensajes WhatsApp.
- `apps/backend/app/repositories/clasificacion_repository.py`
  - Persistencia opcional en `sc_clasificacion.clasificacion_ia` cuando exista `incident_id`.

### Prompting versionado

- `apps/backend/app/llm/prompts/registry.json`
- `apps/backend/app/llm/prompts/PROMPT-IA-CLAS-v1.0.json`
- `apps/backend/app/llm/prompts/test_cases/*.json`

## Variables de entorno nuevas

Agregar en el `.env` del backend:

```env
LLM_PROVIDER=openai
LLM_TIMEOUT_SECONDS=15
LLM_MAX_ATTEMPTS=3

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
```

`LLM_PROVIDER` define el proveedor por defecto del orquestador. Se puede sobreescribir por llamada usando `LLMProviderName.OPENAI` o `LLMProviderName.GEMINI`.

## Flujo de integracion

El punto de entrada para siguientes etapas es `LLMService`.

Ejemplo de uso desde un servicio de negocio:

```python
from app.services.llm_service import LLMService

llm_service = LLMService(db=session)
result = await llm_service.classify_whatsapp_message(
    descripcion="Se reportan intrusos cerca del laboratorio",
    ubicacion="Laboratorio de redes",
    contexto_adicional="Mensaje entrante de WhatsApp",
    incident_id=None,
    persist=False,
)
```

Si luego el mensaje ya esta vinculado a un incidente, se puede cambiar a `persist=True` para grabar el resultado en `sc_clasificacion.clasificacion_ia`.

## Conexion futura con Omnicanal

Para el siguiente paso, la integracion recomendada es dentro del flujo de ingesta de mensajes entrantes, no en el frontend.

Secuencia sugerida:

1. `OmnicanalService.registrar_whatsapp_webhook()` crea o actualiza la conversacion y el mensaje.
2. Se dispara una tarea asincrona o job interno con `LLMService.classify_whatsapp_message()` usando el contenido entrante.
3. El resultado se usa para:
   - priorizar la conversacion,
   - sugerir categoria incidente,
   - marcar `requires_human_review`,
   - preparar el resumen operativo para la bandeja.

No se acoplo todavia al webhook para evitar introducir latencia operativa y porque aun falta definir en que momento del flujo se crea o vincula el incidente.

## Criterios tecnicos implementados

- Proveedor desacoplado del orquestador.
- Fallback conservador con trazabilidad del motivo.
- Prompt activo versionado y recuperable por version.
- Contrato tipado y normalizacion defensiva.
- Preparado para OpenAI y Gemini sin cambiar la capa de servicios.
- Persistencia opcional en la tabla ya existente de clasificacion IA.

## Validacion recomendada

Desde `apps/backend`:

```bash
pytest tests/test_services/test_llm_service.py
```

Si luego integras el flujo con incidentes reales, agrega tests de servicio con `AsyncSession` para validar la persistencia en `sc_clasificacion.clasificacion_ia`.