# Plan funcional y tecnico: bot conversacional WhatsApp SafeCampus

## 1. Contexto

SafeCampus ya cuenta con un motor LLM validado para clasificacion y priorizacion
de incidentes. Ese motor recibe contexto relativamente compacto y estructurado,
por ejemplo formularios o descripciones ya accionables, y devuelve una salida
formal de clasificacion.

Ese comportamiento es correcto para modulos donde el usuario ya completo un
formulario o donde el sistema ya tiene una descripcion clara del incidente.
Sin embargo, en WhatsApp la interaccion empieza como conversacion abierta. El
usuario puede saludar, preguntar, probar el canal, pedir orientacion o reportar
una emergencia con informacion parcial.

Por eso, el bot de WhatsApp no debe usar el clasificador como primera capa de
razonamiento. Debe existir una capa conversacional previa que determine la
intencion, acompane al usuario, recolecte informacion y solo invoque el
clasificador formal cuando ya exista un reporte accionable.

## 2. Problema actual

El flujo actual del bot usa el LLM principalmente como clasificador de incidentes.
El prompt activo esta orientado a:

- clasificar reportes de seguridad,
- asignar categoria,
- asignar severidad,
- marcar revision humana,
- devolver JSON estricto.

Esto genera un problema en WhatsApp: mensajes no accionables como `Hola` pueden
entrar al flujo de clasificacion como si fueran reportes ambiguos. Si la
clasificacion tiene baja confianza o requiere revision humana, la logica del bot
puede derivar a seguridad o intentar tratar el mensaje como incidente.

El resultado es una experiencia demasiado rigida para un canal conversacional.

## 3. Principio de diseno

No se debe modificar ni expandir el clasificador actual para resolver este caso.
El clasificador actual debe mantenerse especializado y estable.

La solucion propuesta es agregar una capa nueva:

```txt
Mensaje WhatsApp
-> Asistente conversacional de triaje
-> decide intencion y siguiente accion
-> recolecta datos o acompana al usuario
-> cuando hay reporte accionable, invoca clasificador existente
-> crea incidente, deriva o continua conversacion
```

## 4. Objetivos funcionales

El bot conversacional debe:

- responder saludos sin crear ni derivar incidentes,
- orientar al usuario sobre que puede reportar,
- detectar emergencias explicitas y derivarlas rapidamente,
- pedir datos faltantes de forma natural,
- mantener contexto breve de la conversacion,
- distinguir mensajes no accionables de reportes reales,
- crear incidente solo cuando hay informacion suficiente o senales criticas,
- derivar a humano cuando hay riesgo alto, incertidumbre relevante o solicitud
  explicita de atencion humana,
- evitar bloquear el webhook de EvolutionAPI.

## 5. Casos que debe cubrir

### Saludo o inicio

Ejemplos:

```txt
Hola
Buenas
Hola, soy David
```

Comportamiento esperado:

- no crear incidente,
- no derivar a humano,
- responder con bienvenida breve,
- preguntar si necesita reportar algo o pedir ayuda.

### Consulta general

Ejemplos:

```txt
Que puedo reportar?
Esto es seguridad PUCP?
Como funciona este canal?
```

Comportamiento esperado:

- explicar el alcance del canal,
- mantener tono claro y breve,
- no invocar el clasificador formal.

### Reporte incompleto

Ejemplos:

```txt
Me robaron
Hay una persona sospechosa
Vi una pelea
```

Comportamiento esperado:

- reconocer el mensaje,
- pedir lugar y detalle minimo,
- no crear incidente si falta informacion critica, salvo senales de urgencia.

### Reporte accionable

Ejemplos:

```txt
Me robaron la mochila en biblioteca central hace 5 minutos.
Hay humo saliendo del laboratorio de quimica.
Una persona esta amenazando a estudiantes en puerta 3.
```

Comportamiento esperado:

- invocar el clasificador actual,
- crear incidente si corresponde,
- actualizar la conversacion,
- responder confirmacion con tono sobrio,
- derivar a humano si la severidad o incertidumbre lo exige.

### Emergencia critica

Ejemplos:

```txt
Hay un herido con sangre en puerta 3.
Alguien tiene un cuchillo.
Hay fuego en el pabellon.
```

Comportamiento esperado:

- derivar inmediatamente a humano,
- crear incidente aunque falten algunos campos,
- pedir datos adicionales sin exponer al usuario,
- sugerir ponerse a salvo si aplica.

### Seguimiento

Ejemplos:

```txt
Como va mi caso?
Hay novedades?
Quiero saber el estado del incidente.
```

Comportamiento esperado:

- si hay incidente asociado, informar que esta registrado y en seguimiento,
- si no hay incidente asociado, pedir referencia o aclarar que aun no existe
  un caso registrado,
- no crear un nuevo incidente por el solo hecho de preguntar.

### Mensaje no accionable o prueba

Ejemplos:

```txt
test
probando
asdf
jaja
```

Comportamiento esperado:

- no crear incidente,
- no derivar,
- responder de forma breve si conviene,
- pedir que describa lo ocurrido si necesita ayuda.

## 6. Arquitectura propuesta

```txt
WhatsApp
-> EvolutionAPI
-> FastAPI webhook
-> guardar mensaje
-> WebSocket a bandeja operativa
-> tarea background del bot
   -> Prompt conversacional WhatsApp
   -> decision de siguiente turno
   -> si corresponde: clasificador actual
   -> actualiza conversacion/chatbot
   -> envia respuesta por EvolutionAPI
   -> WebSocket de actualizacion
```

El frontend no debe llamar a EvolutionAPI ni al LLM directamente. La bandeja
operativa debe seguir consumiendo solo endpoints y WebSocket del backend
SafeCampus.

## 7. Nuevo prompt conversacional

Crear un prompt separado, por ejemplo:

```txt
apps/backend/app/llm/prompts/PROMPT-WHATSAPP-BOT-v1.0.json
```

Este prompt no debe clasificar formalmente el incidente. Su responsabilidad es
decidir la siguiente accion conversacional.

### Rol esperado

El modelo debe actuar como asistente inicial de SafeCampus PUCP por WhatsApp:

- calmado,
- breve,
- util,
- orientado a seguridad,
- no alarmista,
- sin inventar hechos,
- enfocado en ayudar y recolectar informacion,
- capaz de reconocer urgencias.

### Entrada sugerida

```json
{
  "conversation_state": "BOT_NEW",
  "last_user_message": "Hola",
  "recent_messages": [
    {
      "author": "CONTACTO",
      "content": "Hola"
    }
  ],
  "incident_exists": false,
  "incident_draft": {},
  "channel": "WHATSAPP"
}
```

### Salida sugerida

```json
{
  "intent": "GREETING",
  "urgency_signal": "NONE",
  "should_reply": true,
  "should_classify_incident": false,
  "should_create_incident": false,
  "should_handoff": false,
  "missing_fields": [],
  "reply": "Hola, soy el asistente de SafeCampus. Si necesitas reportar algo o pedir ayuda en el campus, cuentame que ocurrio y donde estas.",
  "conversation_summary": "El usuario inicio la conversacion con un saludo."
}
```

## 8. Contrato JSON propuesto

Campos:

- `intent`: intencion principal del mensaje.
- `urgency_signal`: nivel de urgencia conversacional detectado.
- `should_reply`: si el bot debe responder.
- `should_classify_incident`: si ya corresponde invocar el clasificador actual.
- `should_create_incident`: si se recomienda crear incidente despues de clasificar.
- `should_handoff`: si se debe pasar a humano.
- `missing_fields`: datos faltantes para registrar bien el caso.
- `reply`: texto sugerido para WhatsApp.
- `conversation_summary`: resumen breve para memoria operativa.

Valores sugeridos para `intent`:

```txt
GREETING
GENERAL_HELP
INCIDENT_REPORT
EMERGENCY
FOLLOW_UP
PROVIDE_DETAILS
SMALL_TALK
NON_ACTIONABLE
HUMAN_REQUEST
```

Valores sugeridos para `urgency_signal`:

```txt
NONE
LOW
MEDIUM
HIGH
CRITICAL
```

## 9. Reglas de orquestacion

El bot debe invocar el clasificador actual solo si:

- `should_classify_incident=true`, o
- `intent` es `INCIDENT_REPORT`, `EMERGENCY` o `PROVIDE_DETAILS` con descripcion
  suficiente, o
- hay keywords criticas claras como arma, cuchillo, herido, fuego, sangre,
  inconsciente, amenaza directa.

El bot no debe invocar el clasificador actual si:

- el mensaje es solo saludo,
- es una prueba,
- es una consulta general,
- no hay intencion de reporte,
- el usuario pide informacion del canal.

La derivacion a humano debe ocurrir si:

- `urgency_signal` es `HIGH` o `CRITICAL`,
- el clasificador devuelve severidad `ALTO` o `CRITICO`,
- el usuario pide hablar con una persona,
- hay incertidumbre relevante con posible riesgo real,
- la conversacion se atasca tras varios intentos de recoleccion.

## 10. Estados sugeridos del bot

```txt
BOT_NEW
BOT_GREETING
BOT_COLLECTING
BOT_TRIAGING
BOT_INCIDENT_DRAFTED
BOT_ESCALATED
HUMAN_ACTIVE
BOT_PAUSED
```

Uso esperado:

- `BOT_NEW`: inicio de conversacion o ciclo nuevo.
- `BOT_GREETING`: el usuario saludo o pidio orientacion.
- `BOT_COLLECTING`: el bot esta pidiendo datos faltantes.
- `BOT_TRIAGING`: ya hay datos suficientes para evaluar urgencia.
- `BOT_INCIDENT_DRAFTED`: se registro o preparo un incidente.
- `BOT_ESCALATED`: se paso a humano por urgencia o incertidumbre.
- `HUMAN_ACTIVE`: operador humano tomo el chat.
- `BOT_PAUSED`: bot desactivado temporalmente.

## 11. Integracion tecnica sugerida

### Nuevos modelos/esquemas internos

Crear esquemas Pydantic para la respuesta del prompt conversacional:

```txt
apps/backend/app/llm/schemas.py
```

o un modulo especifico:

```txt
apps/backend/app/integrations/messaging/schemas.py
```

Ejemplo conceptual:

```python
class WhatsAppBotDecision(BaseModel):
    intent: WhatsAppBotIntent
    urgency_signal: WhatsAppUrgencySignal
    should_reply: bool
    should_classify_incident: bool
    should_create_incident: bool
    should_handoff: bool
    missing_fields: list[str]
    reply: str | None
    conversation_summary: str | None
```

### Nuevo servicio de decision conversacional

Crear un servicio separado:

```txt
apps/backend/app/services/whatsapp_bot_decision_service.py
```

Responsabilidades:

- construir contexto conversacional,
- invocar Gemini 2.5 Flash con el prompt nuevo,
- normalizar JSON,
- aplicar fallback seguro,
- devolver una decision validada.

### Adaptacion de ChatbotService

`ChatbotService.process_incoming_contact_message` deberia cambiar a:

```txt
1. cargar estado y ultimos mensajes
2. llamar a WhatsAppBotDecisionService
3. si no debe clasificar:
   - actualizar estado
   - enviar reply si corresponde
   - terminar
4. si debe clasificar:
   - llamar a LLMService.classify_whatsapp_message
   - aplicar reglas actuales
   - crear incidente o derivar segun corresponda
5. persistir evento CHATBOT_PROCESADO
```

### Fallback seguro

Si Gemini falla en el prompt conversacional:

- no crear incidente automaticamente,
- responder una pregunta segura si el mensaje no tiene keywords criticas,
- derivar si hay keywords criticas claras.

Respuesta fallback sugerida:

```txt
Hola, soy el asistente de SafeCampus. Para ayudarte, cuentame brevemente que ocurrio y en que lugar del campus estas.
```

## 12. Memoria conversacional

Usar `chatbot_estado_conversacion.memory_snapshot` para mantener:

- resumen breve,
- ultimos mensajes relevantes,
- datos recolectados,
- ultimo intent,
- campos faltantes,
- momento de reset del ciclo.

No se recomienda enviar todo el historial al LLM. Basta con:

- ultimos 6 mensajes,
- resumen acumulado,
- borrador de incidente actual.

## 13. Tono de respuesta

Las respuestas deben ser:

- breves,
- claras,
- empaticas,
- accionables,
- sin tecnicismos,
- sin prometer tiempos exactos no garantizados,
- sin afirmar que seguridad ya esta en camino si solo se esta registrando.

Ejemplos:

Saludo:

```txt
Hola, soy el asistente de SafeCampus. Si necesitas reportar algo o pedir ayuda en el campus, cuentame que ocurrio y donde estas.
```

Dato faltante:

```txt
Gracias. Para ayudarte mejor, dime en que lugar del campus ocurre o ocurrio.
```

Emergencia:

```txt
Estoy derivando esto al equipo de seguridad. Si puedes hacerlo sin exponerte, dime el lugar exacto y alejate de la zona de riesgo.
```

Reporte registrado:

```txt
Gracias. Registre tu reporte para seguimiento operativo. Si tienes mas detalles o fotos, puedes enviarlos por este chat.
```

## 14. Criterios de aceptacion

- `Hola` no crea incidente ni deriva a humano.
- `Hola, soy David` no crea incidente ni deriva a humano.
- `Estoy probando` no crea incidente.
- `Me robaron la mochila en biblioteca` invoca clasificador y puede crear incidente.
- `Hay una persona con cuchillo en puerta 3` crea/deriva con prioridad alta o critica.
- El clasificador actual no se modifica.
- El webhook de EvolutionAPI sigue respondiendo rapido.
- La bandeja recibe actualizaciones por WebSocket.
- Las acciones del bot quedan registradas como eventos de conversacion.
- Hay pruebas unitarias para saludos, consultas, reportes incompletos, reportes
  completos y emergencias.

## 16. Riesgos y mitigaciones

Riesgo: el bot conversa demasiado y retrasa urgencias.
Mitigacion: keywords criticas y `urgency_signal=CRITICAL` deben derivar de inmediato.

Riesgo: el LLM conversacional inventa datos.
Mitigacion: salida JSON estricta, validacion Pydantic y regla de no inventar.

Riesgo: duplicar incidentes.
Mitigacion: revisar `incident_exists`, conversacion activa y `incident_draft` antes
de crear.

Riesgo: afectar el clasificador validado.
Mitigacion: mantener el prompt y pipeline actual intactos; solo agregar una capa
previa.

## 17. Secuencia de implementacion recomendada

1. Crear prompt `PROMPT-WHATSAPP-BOT-v1.0`.
2. Crear esquema Pydantic para decision conversacional.
3. Crear servicio `WhatsAppBotDecisionService`.
4. Integrar el servicio en `ChatbotService`.
5. Ajustar reglas para invocar el clasificador solo cuando corresponda.
6. Agregar tests unitarios de conversacion.
7. Probar manualmente con EvolutionAPI local.
8. Documentar ejemplos reales y actualizar este plan segun resultados.

