# Arquitectura propuesta del modulo WhatsApp para SafeCampus

## Objetivo

Definir la arquitectura exacta para incorporar un modulo de atencion por WhatsApp en SafeCampus, respetando el monorepo actual, la separacion frontend/backend ya adoptada y la base de datos vigente. Este documento parte del estado actual del proyecto y deja claro que la implementacion realizada en esta fase es solo un prototipo frontend con mocks.

## Estado actual de SafeCampus

- `apps/web` ya cuenta con shell operativo, dashboard, KPIs, mapa, incidentes y una ruta `mensajes`.
- `apps/backend` ya concentra la logica de negocio bajo FastAPI y es la unica puerta valida hacia la BD.
- `packages/shared-types` ya define enums y contratos reutilizables del dominio.
- La base de datos ya contempla omnicanalidad y notificaciones:
  - `sc_omnicanal`
  - `sc_incidentes`
  - `sc_notificaciones`
  - `canal_notificacion = 'WHATSAPP'`
  - `tipo_canal = 'MENSAJERIA'`

## Arquitectura exacta recomendada

### 1. Capa Meta / WhatsApp

- Meta WhatsApp Cloud API recibe y entrega mensajes.
- SafeCampus no debe exponer el frontend directamente a Meta.
- Meta debe integrarse solo contra webhooks y servicios del backend.

### 2. Backend SafeCampus (`apps/backend`)

Responsabilidades:

- Exponer webhook de entrada para mensajes, cambios de estado y eventos de entrega.
- Validar firma, origen y payload de Meta.
- Normalizar mensajes entrantes a un modelo interno de conversacion.
- Persistir conversaciones, mensajes, participantes, cola, asignacion y auditoria.
- Ejecutar reglas de negocio:
  - clasificacion automatica
  - deteccion de riesgo
  - creacion o vinculacion con incidentes
  - takeover humano
  - cierre de conversacion
- Exponer endpoints REST/WebSocket para la consola operativa web.

### 3. Base de datos SafeCampus

#### Reutilizacion del modelo actual

Se puede partir de lo que ya existe:

- `sc_incidentes`: para vincular conversaciones con casos reales.
- `sc_notificaciones`: para eventos in-app asociados a conversaciones derivadas o criticas.
- `sc_omnicanal`: como dominio natural para un inbox multicanal.
- `sc_dashboard`: para KPIs agregados del chatbot y del equipo operativo.

#### Tablas nuevas recomendadas a futuro

No se implementan en esta fase, pero para una integracion profesional faltaria modelar al menos:

1. `sc_omnicanal.conversacion`
   - `id`
   - `canal`
   - `canal_externo_id`
   - `telefono_origen`
   - `nombre_contacto`
   - `estado_conversacion`
   - `prioridad`
   - `operador_asignado_id`
   - `incidente_id`
   - `ultima_interaccion_at`
   - `resuelto_por`
   - `created_at`
   - `updated_at`

2. `sc_omnicanal.mensaje_conversacion`
   - `id`
   - `conversacion_id`
   - `direccion` (`INBOUND` / `OUTBOUND`)
   - `autor_tipo` (`USUARIO`, `BOT`, `OPERADOR`, `SISTEMA`)
   - `contenido`
   - `tipo_contenido`
   - `meta_message_id`
   - `estado_entrega`
   - `payload_raw`
   - `created_at`

3. `sc_omnicanal.participante_conversacion`
   - `id`
   - `conversacion_id`
   - `usuario_id`
   - `rol`
   - `joined_at`

4. `sc_omnicanal.evento_conversacion`
   - `id`
   - `conversacion_id`
   - `tipo_evento`
   - `payload`
   - `created_at`

5. `sc_dashboard.kpi_chatbot`
   - agregados por periodo, cola, operador, intent y tipo de resolucion

#### Relacion con el modelo actual de incidentes

La relacion profesional en SafeCampus no debe ser un chat aislado. La conversacion de WhatsApp debe poder:

- crear un incidente
- quedar vinculada a un incidente existente
- escalar a un operador o supervisor
- disparar notificaciones internas
- alimentar KPIs de atencion y resolucion

## Arquitectura del monorepo

### Ubicacion correcta por capa

- `apps/web/src/app/(operativo)/mensajes`
  - pagina operativa y entrypoint del modulo
- `apps/web/src/features/whatsapp`
  - mocks, tipos, componentes y logica puramente frontend del prototipo
- `packages/ui-kit`
  - solo primitives compartidas y agnosticas del dominio
- `packages/shared-types`
  - enums y contratos compartidos reales del dominio

### Decision de implementacion para esta fase

En prototipo:

- la UI especifica del inbox y dashboard se queda en `apps/web`
- no se crean componentes compartidos en `packages/ui-kit`
- no se toca backend
- no se toca BD
- no se hace integracion e2e

## Comparacion: ChatAssist vs SafeCampus

### Lo que si conviene tomar de ChatAssist

- bandeja con lista lateral de conversaciones
- vista detallada del chat
- takeover humano
- asignacion a agentes
- filtros por estado y prioridad
- dashboard con KPIs de operacion y chatbot
- respuestas rapidas

### Lo que SafeCampus necesita y ChatAssist no resuelve por si solo

1. Contexto operativo y no solo soporte.
   SafeCampus no atiende solo consultas; atiende riesgo, incidentes y escalamiento.

2. Vinculo fuerte con incidentes.
   Cada conversacion debe poder conectarse con `sc_incidentes`.

3. Priorizacion por severidad.
   El inbox debe priorizar casos `ALTO` y `CRITICO`, no solo chats no leidos.

4. Trazabilidad y auditoria.
   Debe quedar registro de derivacion, reasignacion, cierre, takeover y respuestas del bot.

5. KPIs orientados a seguridad y operacion.
   No basta con satisfaccion o calidad del bot; tambien se necesita tiempo de primera respuesta, casos escalados, contencion automatizada, saturacion de operadores y conversaciones vinculadas a incidentes.

### Conclusiones de la comparacion

- ChatAssist sirve como referencia de UX para inbox y dashboard.
- SafeCampus requiere un modelo mas operativo, mas auditable y mas vinculado al dominio de incidentes.
- La forma profesional para SafeCampus es una consola operativa omnicanal con especializacion en WhatsApp, no un simple panel de soporte.

## Flujo objetivo futuro

1. Usuario escribe por WhatsApp.
2. Meta envia webhook a FastAPI.
3. Backend normaliza y persiste la conversacion.
4. Reglas identifican intencion, riesgo y necesidad de incidente.
5. Si aplica, se crea o vincula incidente.
6. La consola operativa recibe el evento en tiempo real.
7. Operador toma control, responde, deriva o cierra.
8. El sistema actualiza KPIs y auditoria.

## Modulo frontend prototipo implementado en esta fase

La implementacion frontend hecha en esta fase incluye:

- bandeja de conversaciones WhatsApp con filtros y busqueda
- gestion de chats con takeover, asignacion, cierre y respuestas rapidas
- panel de contexto del caso e incidente vinculado
- dashboard del chatbot con KPIs mock
- datos mock alineados con el dominio actual de incidentes y severidad

## Alcance fuera de esta fase

No se implementa en esta fase:

- webhook de Meta
- persistencia backend
- nuevas tablas SQL
- integracion real con Supabase/PostgreSQL
- autenticacion de agentes de Meta
- sincronizacion en tiempo real real

## Recomendacion de roadmap

1. Validar UX del prototipo con usuarios operativos.
2. Cerrar modelo de datos omnicanal en `sc_omnicanal`.
3. Implementar webhook y servicios FastAPI.
4. Integrar inbox web con endpoints reales.
5. Agregar realtime y auditoria.
6. Consolidar KPIs de chatbot y operacion en `sc_dashboard`.