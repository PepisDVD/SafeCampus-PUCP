# Especificación Técnica: Módulo de Integración LLM

**SafeCampus PUCP — v1.0**

*Tesis para obtener el título profesional de Ingeniería Informática*

**AUTORA:** Yomira Rossana Salazar Canto  
**AUTOR:** Luis David Pachas Atuncar  
**ASESOR:** José Antonio Pow Sang Portillo

Lima, 13 de mayo, 2026

---

## Historial de versiones

| Fecha      | Versión | Descripción                                                          | Autor        |
|------------|---------|----------------------------------------------------------------------|--------------|
| 13/05/2026 | 1.0     | Primera definición de la Especificación Técnica del Módulo LLM.      | Luis Pachas  |

---

## Tabla de contenido

1. [Introducción](#1-introducción)
2. [Guía de Prompts y Plantillas para Plataforma IA](#2-guía-de-prompts-y-plantillas-para-plataforma-ia)
3. [Estrategia y Reglas de Fallback para IA](#3-estrategia-y-reglas-de-fallback-para-ia)
4. [Integración con OpenAI — Cliente LLM](#4-integración-con-openai--cliente-llm)
5. [Gestor de API Keys (LLMKeyManager)](#5-gestor-de-api-keys-llmkeymanager)
6. [Repositorio y Fábrica de Prompts (PromptFactory)](#6-repositorio-y-fábrica-de-prompts-promptfactory)
7. [Normalizador LLM y Contrato de Salida](#7-normalizador-llm-y-contrato-de-salida)
8. [Coherencia con artefactos existentes](#8-coherencia-con-artefactos-existentes)
9. [Anexos](#9-anexos)

---

## 1. Introducción

El presente documento establece la especificación técnica de los componentes que conforman el Módulo LLM de SafeCampus PUCP. Este módulo materializa la capacidad de clasificación y priorización asistida por inteligencia artificial descrita en el Plan de Integración del LLM (v1.0) y en el Diagrama de Arquitectura del Chatbot (v1.0).

De acuerdo con el principio rector del sistema, todo procesamiento inteligente ocurre dentro del flujo controlado por el backend central, bajo validaciones, persistencia y trazabilidad comunes. El módulo LLM no es un sistema autónomo, sino un conjunto de componentes especializados que operan bajo la autoridad del backend central de SafeCampus.

### 1.1 Propósito

Definir con precisión técnica y académica los contratos, algoritmos, reglas y estructuras de datos de los siguientes componentes:

- Guía de prompts y plantillas para plataforma IA
- Estrategia y reglas de fallback para IA
- Cliente LLM (integración con OpenAI)
- Gestor de API Keys
- Repositorio y Fábrica de Prompts
- Normalizador LLM y contrato de salida

### 1.2 Alcance

Esta especificación cubre el diseño técnico de los componentes del Módulo LLM y sus interfaces con los componentes del backend central. No cubre el despliegue en infraestructura productiva ni la configuración de entornos CI/CD.

### 1.3 Convenciones del documento

- Los nombres de componentes se escriben en **negrita** en su primera mención.
- Los nombres de clases, métodos y campos se escriben en `código`.
- Las versiones de prompt siguen la convención `PROMPT-IA-CLAS-vX.Y`.
- Los valores por defecto aplicados en fallback se indican con el prefijo `[DEFAULT]`.

---

## 2. Guía de Prompts y Plantillas para Plataforma IA

> **Artefacto asociado:** `docs/LLM/Ciclo_Vida_Prompts.drawio.xml`

### 2.1 Objetivo

Los prompts son artefactos funcionales de primera clase en SafeCampus PUCP. No son cadenas de texto informales, sino componentes de integración versionados, testeados y alineados con las reglas de negocio del sistema. Su objetivo es instruir al modelo de lenguaje para que produzca una clasificación de incidente estructurada, determinista en su formato y alineada con la taxonomía operativa del sistema.

### 2.2 Taxonomía operativa

#### 2.2.1 Categorías de incidente

| Código                         | Descripción                                                                        |
|--------------------------------|------------------------------------------------------------------------------------|
| `VIOLENCIA`                    | Agresiones físicas, peleas, intimidación, acoso, amenazas directas.               |
| `ROBO_HURTO`                   | Sustracción de bienes, asalto con o sin violencia, carterismo, robo de vehículo.  |
| `ACCIDENTE`                    | Caídas, colisiones, accidentes de tránsito dentro del campus, lesiones no intencionales. |
| `INCENDIO_EMERGENCIA`          | Fuego, humo, cortocircuito, emergencia médica masiva, derrames peligrosos.        |
| `DAÑO_INFRAESTRUCTURA`         | Vandalismo, grafiti, deterioro intencional de instalaciones o equipos.            |
| `COMPORTAMIENTO_SOSPECHOSO`    | Vigilancia no autorizada, ingreso indebido, actitud sospechosa sin acción directa.|
| `OBJETO_PERDIDO_ENCONTRADO`    | Extravío o hallazgo de pertenencias dentro del campus universitario.              |
| `OTRO`                         | Eventos que no corresponden a ninguna categoría anterior.                          |

#### 2.2.2 Niveles de severidad

| Nivel      | Definición operativa                                                                 | Tiempo de atención objetivo |
|------------|--------------------------------------------------------------------------------------|-----------------------------|
| `CRITICO`  | Amenaza inmediata para la vida o integridad física de personas.                      | Inmediato (< 5 min)         |
| `ALTO`     | Situación urgente que requiere intervención inmediata del equipo de seguridad.       | < 15 minutos                |
| `MEDIO`    | Situación que requiere atención en el corto plazo, sin riesgo inminente.             | < 2 horas                   |
| `BAJO`     | Evento informativo sin riesgo inmediato, atención en el transcurso del día.          | < 24 horas                  |

#### 2.2.3 Indicadores de criticidad automática

Los siguientes términos, detectados en la descripción del incidente, elevan la severidad a `CRITICO` o `ALTO` independientemente de la clasificación inicial del modelo:

**Nivel CRITICO:** `arma`, `cuchillo`, `pistola`, `disparo`, `puñalada`, `herido`, `sangre`, `inconsciente`, `no respira`, `fuego`, `incendio`, `explosión`, `humo denso`, `personas atrapadas`, `múltiples víctimas`.

**Nivel ALTO:** `amenaza`, `pelea`, `forcejeo`, `gritos`, `robo en progreso`, `intrusos`, `emergencia médica`.

### 2.3 Estructura base del prompt

Todo prompt de clasificación del módulo LLM debe contener, en orden, los siguientes bloques:

1. **Declaración de rol y contexto del sistema** — define quién es el modelo y cuál es su función.
2. **Taxonomía de categorías** — listado explícito de categorías válidas con sus definiciones.
3. **Niveles de severidad** — definición operativa de cada nivel.
4. **Indicadores de criticidad** — patrones que elevan la severidad automáticamente.
5. **Condiciones de zona de incertidumbre** — cuándo marcar `requires_human_review = true`.
6. **Restricciones de respuesta** — el modelo solo responde en el formato JSON especificado.
7. **Formato exacto de salida** — schema JSON con tipos de dato y restricciones.

### 2.4 Plantilla PROMPT-IA-CLAS-v1.0

A continuación se presenta la plantilla de clasificación vigente. Esta plantilla está almacenada en `app/integrations/messaging/llm/prompts/PROMPT-IA-CLAS-v1.0.json`.

#### 2.4.1 Mensaje de sistema (system message)

```
Eres un clasificador de incidentes de seguridad del campus universitario SafeCampus PUCP.
Tu función es analizar reportes de incidentes enviados por miembros de la comunidad PUCP
y devolver una clasificación estructurada en formato JSON estricto.

TAXONOMÍA DE CATEGORÍAS VÁLIDAS:
• VIOLENCIA: agresiones físicas, peleas, intimidación, acoso, amenazas directas.
• ROBO_HURTO: sustracción de bienes, asalto con o sin violencia, carterismo.
• ACCIDENTE: caídas, colisiones, accidentes de tránsito, lesiones no intencionales.
• INCENDIO_EMERGENCIA: fuego, humo, cortocircuito, emergencia médica masiva.
• DAÑO_INFRAESTRUCTURA: vandalismo, grafiti, deterioro intencional de instalaciones.
• COMPORTAMIENTO_SOSPECHOSO: vigilancia no autorizada, ingreso indebido, actitud sospechosa.
• OBJETO_PERDIDO_ENCONTRADO: extravío o hallazgo de pertenencias en el campus.
• OTRO: eventos que no corresponden a ninguna categoría anterior.

NIVELES DE SEVERIDAD:
• CRITICO: amenaza inmediata para la vida o la integridad física de personas.
• ALTO: situación urgente que requiere atención inmediata del equipo de seguridad (< 15 min).
• MEDIO: situación que requiere atención en el corto plazo, sin riesgo inminente (< 2 horas).
• BAJO: evento informativo sin riesgo inmediato, atención en el transcurso del día.

INDICADORES DE CRITICIDAD (elevan severidad a CRITICO sin importar el contexto):
- arma, cuchillo, pistola, disparo, puñalada
- herido, sangre, inconsciente, no respira
- fuego, incendio, explosión, humo denso
- múltiples víctimas, personas atrapadas

CONDICIONES PARA ZONA DE INCERTIDUMBRE (establece requires_human_review = true):
- La descripción es ambigua o contradictoria y no permite categorización confiable.
- El reporte presenta indicadores simultáneos de categorías incompatibles.
- La severidad estimada es inconsistente con la gravedad descrita.
- El texto es ininteligible, vacío o claramente irrelevante para seguridad del campus.

RESTRICCIONES:
- Responde ÚNICAMENTE con el objeto JSON especificado. Sin texto adicional antes ni después.
- No inventes información que no esté presente en el reporte.
- No uses categorías ni severidades fuera de las definidas.
- Si el reporte está vacío: usa categoria=OTRO, severidad=BAJO, confidence_score=0.1,
  requires_human_review=true.

FORMATO DE SALIDA (JSON estricto, sin markdown, sin texto adicional):
{
  "categoria": "<CATEGORIA_VALIDA>",
  "severidad": "<NIVEL_SEVERIDAD>",
  "confidence_score": <número decimal entre 0.0 y 1.0>,
  "requires_human_review": <true o false>,
  "indicadores_detectados": ["<indicador1>", "<indicador2>"],
  "razonamiento_breve": "<texto en español, máximo 120 caracteres>",
  "version_prompt": "PROMPT-IA-CLAS-v1.0"
}
```

#### 2.4.2 Mensaje de usuario (user message template)

```
Clasifica el siguiente reporte de incidente de seguridad:

CANAL DE ORIGEN: {canal}
DESCRIPCIÓN DEL INCIDENTE: {descripcion}
UBICACIÓN REPORTADA: {ubicacion}
FECHA Y HORA: {fecha_hora}
CONTEXTO ADICIONAL: {contexto_adicional}
```

Los campos entre llaves `{}` son variables de interpolación que la **Fábrica de Prompts** reemplaza en tiempo de ejecución antes de enviar la solicitud al modelo.

### 2.5 Convención de versionado y registro

Cada versión de prompt debe registrarse en el repositorio con los siguientes metadatos:

```json
{
  "id": "PROMPT-IA-CLAS-v1.0",
  "tipo": "clasificacion",
  "version_mayor": 1,
  "version_menor": 0,
  "fecha_creacion": "2026-05-13",
  "autor": "Luis Pachas / Yomira Salazar",
  "proposito": "Clasificación y priorización asistida de incidentes de seguridad PUCP",
  "cambios": "Versión inicial. Taxonomía con 8 categorías y 4 niveles de severidad.",
  "modelo_objetivo": "gpt-4o-mini",
  "temperatura": 0.0,
  "max_tokens": 300,
  "casos_de_prueba": ["TC-CLAS-001", "TC-CLAS-002", "TC-CLAS-003"],
  "estado": "activo",
  "aprobado_por": "José Antonio Pow Sang Portillo",
  "fecha_aprobacion": "2026-05-13"
}
```

**Convención de nombre:**

```
PROMPT-IA-{TIPO}-v{MAYOR}.{MENOR}

Donde:
  TIPO   = CLAS (clasificación) | PRIO (priorización) | CONV (conversacional)
  MAYOR  = número de versión mayor (cambio de taxonomía o estructura base)
  MENOR  = número de versión menor (ajuste de instrucciones o redacción)
```

Cambios de versión menor (v1.0 → v1.1) se aplican cuando se ajusta redacción, se agregan restricciones o se refinan ejemplos sin modificar la taxonomía. Cambios de versión mayor (v1.0 → v2.0) se aplican cuando se modifica la taxonomía de categorías, los niveles de severidad o el formato de salida.

### 2.6 Instrucciones de redacción y validación

Antes de activar una nueva versión de prompt, debe cumplirse el siguiente proceso mínimo de validación:

| Paso | Actividad                                          | Criterio de aceptación                                              |
|------|----------------------------------------------------|---------------------------------------------------------------------|
| 1    | Ejecutar suite de casos de prueba existentes       | ≥ 90% de casos clasificados correctamente en categoría y severidad  |
| 2    | Probar con 5 casos borde documentados              | 0 errores de formato (JSON inválido o campos faltantes)             |
| 3    | Verificar que `version_prompt` esté en la salida   | Campo presente y con valor correcto en el 100% de los casos         |
| 4    | Revisar tasa de `requires_human_review = true`     | No supera el 20% en casos de prueba estándar                        |
| 5    | Aprobación de responsable técnico                  | Firma en el registro de metadatos del prompt                        |

---

## 3. Estrategia y Reglas de Fallback para IA

> **Artefacto asociado:** `docs/LLM/Estrategia_Fallback_LLM.drawio.xml`

### 3.1 Principios generales

La estrategia de fallback garantiza que el sistema nunca quede en un estado inconsistente o indeterminado como consecuencia de un fallo en la integración con el proveedor de IA. Los principios que rigen esta estrategia son:

1. **Disponibilidad sobre precisión:** si el LLM no está disponible, el sistema asigna una clasificación conservadora por defecto y continúa operando.
2. **Transparencia:** todo fallback aplicado queda registrado en el expediente único con la razón explícita.
3. **Escalamiento humano:** toda clasificación por defecto deriva automáticamente el caso a revisión humana.
4. **Idempotencia:** aplicar el mecanismo de fallback más de una vez produce el mismo resultado.

### 3.2 Clasificación por defecto (DefaultClassification)

Cuando cualquier condición de fallback se activa y los reintentos se agotan, el sistema aplica la siguiente clasificación conservadora:

```python
DEFAULT_CLASSIFICATION = {
    "categoria": "OTRO",
    "severidad": "MEDIO",
    "confidence_score": 0.0,
    "requires_human_review": True,
    "indicadores_detectados": [],
    "razonamiento_breve": "Clasificación por defecto. Requiere revisión humana.",
    "version_prompt": None,
    "fallback_applied": True,
    "fallback_reason": "<razón específica del fallo>",
    "processing_timestamp": "<timestamp UTC>",
}
```

La elección de `severidad=MEDIO` como valor por defecto responde al principio de precaución: garantiza que el caso sea atendido en un tiempo razonable (< 2 horas) sin generar una alarma innecesaria.

### 3.3 Taxonomía de escenarios de fallo

| ID       | Escenario                                 | Condición de detección                                      | Acción                                     |
|----------|-------------------------------------------|-------------------------------------------------------------|--------------------------------------------|
| `FB-01`  | API no disponible (timeout/red)           | `httpx.TimeoutException` o `httpx.ConnectError`            | Reintentar hasta 2 veces con backoff       |
| `FB-02`  | Error HTTP del servidor (5xx)             | Código de respuesta HTTP 500–599                            | Reintentar hasta 2 veces con backoff       |
| `FB-03`  | Error de autenticación (401/403)          | Código de respuesta HTTP 401 o 403                          | No reintentar; fallback inmediato          |
| `FB-04`  | Límite de tasa excedido (429)             | Código de respuesta HTTP 429                                | Esperar `retry-after`; reintentar 1 vez   |
| `FB-05`  | Respuesta JSON malformada                 | `json.JSONDecodeError` al parsear la respuesta              | Reintentar 1 vez; fallback si persiste     |
| `FB-06`  | Contrato de salida incompleto             | Campos obligatorios ausentes en el JSON parseado            | Normalizar con valores por defecto         |
| `FB-07`  | Valores de categoría/severidad inválidos  | Valor no pertenece a la taxonomía definida                  | Mapear a `OTRO` / `MEDIO` respectivamente  |
| `FB-08`  | Confidence score bajo umbral              | `confidence_score < 0.60`                                   | Marcar `requires_human_review = true`      |
| `FB-09`  | Reintentos agotados                       | Contador de intentos ≥ 3 (1 original + 2 reintentos)        | Aplicar DefaultClassification              |
| `FB-10`  | Excepción no manejada                     | Cualquier excepción no contemplada en los casos anteriores  | Registrar en log; aplicar DefaultClassification |

### 3.4 Lógica de reintento y backoff exponencial

Los reintentos aplican únicamente para los escenarios `FB-01`, `FB-02` y `FB-05`. No se reintenta en errores de autenticación (`FB-03`) para evitar bloqueos de cuenta.

```python
RETRY_CONFIG = {
    "max_attempts": 3,          # 1 intento original + 2 reintentos
    "backoff_base_seconds": 1,  # Espera base entre reintentos
    "backoff_multiplier": 2,    # Factor de multiplicación exponencial
    # Intentos: inmediato → espera 1s → espera 2s
    "timeout_per_attempt_seconds": 15,
    "retry_on_status_codes": [500, 502, 503, 504],
}
```

Secuencia de intentos:
- **Intento 1:** t=0s (inmediato)
- **Intento 2:** t=1s (backoff 1 × 1s)
- **Intento 3:** t=3s (backoff 1 × 2s)
- **Fallback aplicado** si el intento 3 falla.

### 3.5 Umbral de confianza y zona de incertidumbre

La zona de incertidumbre se activa cuando el modelo devuelve un `confidence_score` por debajo del umbral operativo o cuando declara explícitamente incertidumbre:

| Condición                               | Acción del sistema                                          |
|-----------------------------------------|-------------------------------------------------------------|
| `confidence_score >= 0.80`              | Clasificación automática aceptada sin intervención humana   |
| `0.60 <= confidence_score < 0.80`       | Clasificación aceptada; caso marcado como revisión sugerida |
| `confidence_score < 0.60`               | `requires_human_review = true`; caso en cola de revisión   |
| `requires_human_review = true` (LLM)    | `requires_human_review = true`; prevalece sobre el score   |

### 3.6 Matriz de decisión de fallback

| Condición                        | Reintentar | Normalizar | Default | Human Review |
|----------------------------------|:----------:|:----------:|:-------:|:------------:|
| Timeout / Error de red           | ✓ (max 2)  | —          | Si falla | ✓            |
| Error HTTP 5xx                   | ✓ (max 2)  | —          | Si falla | ✓            |
| Error HTTP 401/403               | ✗          | —          | ✓        | ✓            |
| Error HTTP 429 (rate limit)      | ✓ (max 1)  | —          | Si falla | ✓            |
| JSON malformado                  | ✓ (max 1)  | —          | Si falla | ✓            |
| Campos faltantes en contrato     | ✗          | ✓          | —        | Condicional  |
| Valor de categoría inválido      | ✗          | ✓ → OTRO   | —        | ✓            |
| Valor de severidad inválido      | ✗          | ✓ → MEDIO  | —        | ✓            |
| Confidence < 0.60                | ✗          | —          | —        | ✓            |
| Reintentos agotados              | —          | —          | ✓        | ✓            |

---

## 4. Integración con OpenAI — Cliente LLM

> **Artefacto asociado:** `docs/LLM/Integracion_OpenAI_C4.drawio.xml`

### 4.1 Biblioteca y versión

La integración con OpenAI se implementa mediante la biblioteca oficial `openai` para Python. La elección de esta biblioteca sobre alternativas como `httpx` directo se justifica por su soporte nativo de tipado, manejo de errores estructurado y compatibilidad garantizada con la API de OpenAI.

```
openai>=1.30.0
```

El cliente se configura en modo **asíncrono** (`AsyncOpenAI`) para ser compatible con el servidor FastAPI del backend central.

### 4.2 Módulo del cliente LLM

El cliente LLM se implementa en `app/integrations/messaging/llm/openai_client.py`. Su responsabilidad es exclusivamente comunicarse con la API de OpenAI y devolver la respuesta cruda. La validación, normalización y aplicación de reglas de negocio son responsabilidad de otros componentes.

```python
# Contrato de la función principal del cliente
async def invoke_classification(
    system_prompt: str,
    user_prompt: str,
    model: str,
    temperature: float,
    max_tokens: int,
    correlation_id: str,
) -> str:
    """
    Invoca la API de OpenAI y retorna el texto crudo de la respuesta.
    
    Raises:
        LLMTimeoutError: si la solicitud excede el timeout configurado.
        LLMAuthError: si las credenciales son inválidas (HTTP 401/403).
        LLMRateLimitError: si se excede el límite de tasa (HTTP 429).
        LLMServerError: si el proveedor reporta error de servidor (HTTP 5xx).
        LLMClientError: para cualquier otro error de la biblioteca openai.
    """
```

### 4.3 Parámetros de invocación

| Parámetro          | Valor para PROMPT-IA-CLAS-v1.0 | Justificación                                               |
|--------------------|--------------------------------|-------------------------------------------------------------|
| `model`            | `gpt-4o-mini`                  | Balance entre costo, velocidad y capacidad de razonamiento  |
| `temperature`      | `0.0`                          | Máxima determinismo; la clasificación debe ser reproducible |
| `max_tokens`       | `300`                          | Suficiente para el JSON de salida; evita respuestas largas  |
| `response_format`  | `{"type": "json_object"}`      | Fuerza al modelo a responder en JSON válido                 |
| `timeout`          | `15` segundos por intento      | Equilibrio entre latencia aceptable y resiliencia           |

### 4.4 Manejo de errores HTTP

El cliente traduce los errores de la biblioteca `openai` a excepciones propias del sistema para desacoplar el código de negocio del proveedor:

| Error openai                    | Excepción propia          | Escenario de fallback |
|---------------------------------|---------------------------|-----------------------|
| `APITimeoutError`               | `LLMTimeoutError`         | FB-01                 |
| `APIConnectionError`            | `LLMTimeoutError`         | FB-01                 |
| `AuthenticationError`           | `LLMAuthError`            | FB-03                 |
| `RateLimitError`                | `LLMRateLimitError`       | FB-04                 |
| `InternalServerError`           | `LLMServerError`          | FB-02                 |
| `APIError` (otros)              | `LLMClientError`          | FB-10                 |

### 4.5 Logging y trazabilidad

Cada invocación al cliente LLM genera las siguientes entradas de log estructurado:

```json
// Al iniciar la invocación
{
  "level": "INFO",
  "event": "llm_invocation_start",
  "correlation_id": "<uuid>",
  "incident_id": "<uuid>",
  "model": "gpt-4o-mini",
  "prompt_version": "PROMPT-IA-CLAS-v1.0",
  "attempt": 1
}

// Al completar exitosamente
{
  "level": "INFO",
  "event": "llm_invocation_success",
  "correlation_id": "<uuid>",
  "latency_ms": 843,
  "tokens_prompt": 412,
  "tokens_completion": 87,
  "tokens_total": 499
}

// En caso de fallo
{
  "level": "WARNING",
  "event": "llm_invocation_error",
  "correlation_id": "<uuid>",
  "error_type": "LLMTimeoutError",
  "attempt": 2,
  "will_retry": true
}
```

---

## 5. Gestor de API Keys (LLMKeyManager)

El **Gestor de API Keys** (`app/integrations/messaging/llm/key_manager.py`) administra las credenciales de acceso al proveedor de IA. Es el único componente del sistema autorizado a leer y proveer claves de API.

### 5.1 Responsabilidades

- Leer credenciales desde variables de entorno en tiempo de inicialización.
- Proveer la clave activa al cliente LLM en cada invocación.
- Registrar el consumo de tokens por invocación para monitoreo de uso.
- Detectar errores de autenticación y señalizar al orquestador para activar fallback.

### 5.2 Estrategia de almacenamiento seguro

Las credenciales **nunca** se almacenan en código fuente, archivos de configuración versionados ni logs del sistema. La estrategia de almacenamiento sigue el orden de prioridad:

| Prioridad | Fuente                                     | Entorno de uso         |
|-----------|--------------------------------------------|------------------------|
| 1         | Variable de entorno `OPENAI_API_KEY`       | Producción y desarrollo|
| 2         | Archivo `.env` (no versionado en git)      | Desarrollo local       |

```python
# Interfaz del gestor
class LLMKeyManager:
    def get_active_key(self) -> str:
        """Retorna la API key activa para el proveedor configurado."""

    def record_usage(self, tokens_prompt: int, tokens_completion: int) -> None:
        """Registra el consumo de tokens de la última invocación."""

    def get_usage_summary(self) -> dict:
        """Retorna el resumen acumulado de tokens consumidos en la sesión."""
```

### 5.3 Reglas de seguridad

1. La clave de API **nunca** aparece en logs, ni siquiera parcialmente (no aplicar técnicas de ofuscación como mostrar los últimos 4 caracteres).
2. La clave **nunca** se serializa en respuestas HTTP del backend.
3. El gestor lanza `LLMAuthError` si la variable de entorno `OPENAI_API_KEY` no está configurada al iniciar el servicio.
4. En caso de error HTTP 401/403 del proveedor, el gestor registra el evento como `KEY_INVALID` en el log de auditoría sin exponer el valor.

### 5.4 Registro de consumo de tokens

El consumo de tokens se registra en cada invocación para permitir el monitoreo de costos operativos:

```python
USAGE_LOG_ENTRY = {
    "timestamp": "<ISO 8601 UTC>",
    "correlation_id": "<uuid>",
    "incident_id": "<uuid>",
    "model": "gpt-4o-mini",
    "prompt_version": "PROMPT-IA-CLAS-v1.0",
    "tokens_prompt": 412,
    "tokens_completion": 87,
    "tokens_total": 499,
    "estimated_cost_usd": 0.000075,  # Calculado según tarifa vigente del modelo
}
```

---

## 6. Repositorio y Fábrica de Prompts (PromptFactory)

El **Repositorio de Prompts** es la fuente de verdad de todas las plantillas de prompt del sistema. La **Fábrica de Prompts** es el componente que selecciona la plantilla vigente, la compila con los datos del incidente y la entrega al orquestador de clasificación.

### 6.1 Estructura del repositorio

```
app/integrations/messaging/llm/prompts/
├── registry.json                    # Índice de todas las versiones de prompt
├── PROMPT-IA-CLAS-v1.0.json         # Plantilla de clasificación v1.0
└── test_cases/
    ├── TC-CLAS-001.json             # Caso de prueba: violencia con indicador crítico
    ├── TC-CLAS-002.json             # Caso de prueba: objeto perdido, severidad baja
    └── TC-CLAS-003.json             # Caso de prueba: reporte ambiguo (zona incertidumbre)
```

### 6.2 Formato de almacenamiento del prompt

Cada archivo de prompt es un JSON con la siguiente estructura:

```json
{
  "metadata": {
    "id": "PROMPT-IA-CLAS-v1.0",
    "tipo": "clasificacion",
    "version_mayor": 1,
    "version_menor": 0,
    "fecha_creacion": "2026-05-13",
    "autor": "Luis Pachas / Yomira Salazar",
    "modelo_objetivo": "gpt-4o-mini",
    "temperatura": 0.0,
    "max_tokens": 300,
    "estado": "activo"
  },
  "system_message": "<contenido del system message>",
  "user_message_template": "<plantilla del user message con {variables}>",
  "variables_requeridas": ["canal", "descripcion", "ubicacion", "fecha_hora", "contexto_adicional"],
  "output_schema_version": "1.0"
}
```

### 6.3 Interfaz de la fábrica

```python
class PromptFactory:
    def get_active_prompt(self, tipo: str = "clasificacion") -> PromptTemplate:
        """
        Retorna la plantilla activa del tipo especificado.
        Lee el registro y retorna la versión con estado='activo'.
        Raises PromptNotFoundError si no existe ninguna versión activa.
        """

    def compile_user_message(self, template: PromptTemplate, variables: dict) -> str:
        """
        Interpola las variables en la plantilla del user message.
        Raises MissingPromptVariableError si falta alguna variable requerida.
        """

    def get_prompt_by_version(self, version_id: str) -> PromptTemplate:
        """
        Retorna una versión específica de prompt por su ID.
        Usado para reproducibilidad en auditoría.
        """
```

### 6.4 Reglas de selección de versión activa

1. Solo puede existir **una versión activa** por tipo de prompt a la vez.
2. El campo `estado` del `registry.json` controla qué versión está activa (`"activo"` / `"inactivo"` / `"deprecado"`).
3. Cambiar la versión activa requiere: (a) marcar la versión anterior como `"inactivo"`, (b) marcar la nueva versión como `"activo"`, (c) registrar el cambio en el log de auditoría.
4. Las versiones `"deprecado"` se conservan en el repositorio para trazabilidad histórica.

---

## 7. Normalizador LLM y Contrato de Salida

El **Normalizador LLM** (`app/integrations/messaging/llm/normalizer.py`) es el componente que recibe la respuesta cruda del modelo, valida que cumpla el contrato de salida definido y produce una estructura tipada y validada para el Motor de Reglas de Negocio.

### 7.1 Contrato de salida — Esquema Pydantic

```python
from pydantic import BaseModel, Field, field_validator
from enum import Enum
from typing import List, Optional
from datetime import datetime

class CategoriaIncidente(str, Enum):
    VIOLENCIA = "VIOLENCIA"
    ROBO_HURTO = "ROBO_HURTO"
    ACCIDENTE = "ACCIDENTE"
    INCENDIO_EMERGENCIA = "INCENDIO_EMERGENCIA"
    DAÑO_INFRAESTRUCTURA = "DAÑO_INFRAESTRUCTURA"
    COMPORTAMIENTO_SOSPECHOSO = "COMPORTAMIENTO_SOSPECHOSO"
    OBJETO_PERDIDO_ENCONTRADO = "OBJETO_PERDIDO_ENCONTRADO"
    OTRO = "OTRO"

class NivelSeveridad(str, Enum):
    CRITICO = "CRITICO"
    ALTO = "ALTO"
    MEDIO = "MEDIO"
    BAJO = "BAJO"

class LLMRawResponse(BaseModel):
    """Estructura directamente deserializada desde la respuesta JSON del LLM."""
    categoria: CategoriaIncidente
    severidad: NivelSeveridad
    confidence_score: float = Field(ge=0.0, le=1.0)
    requires_human_review: bool
    indicadores_detectados: List[str] = Field(default_factory=list)
    razonamiento_breve: str = Field(max_length=120)
    version_prompt: str

class ClasificacionFinal(BaseModel):
    """Estructura validada y enriquecida que se persiste en el expediente único."""
    # Campos del LLM (posiblemente normalizados)
    categoria: CategoriaIncidente
    severidad: NivelSeveridad
    confidence_score: float
    requires_human_review: bool
    indicadores_detectados: List[str]
    razonamiento_breve: str
    version_prompt: Optional[str]

    # Campos añadidos por el normalizador y el motor de reglas
    fallback_applied: bool = False
    fallback_reason: Optional[str] = None
    business_rules_applied: List[str] = Field(default_factory=list)

    # Trazabilidad
    incident_id: str
    correlation_id: str
    processing_timestamp: datetime
    model_used: str
    latency_ms: Optional[int] = None
```

### 7.2 Validaciones aplicadas por el normalizador

El normalizador aplica las siguientes validaciones en secuencia, deteniéndose al primer error irrecuperable:

| Paso | Validación                                    | Acción si falla                                |
|------|-----------------------------------------------|------------------------------------------------|
| 1    | JSON parseable desde el texto de la respuesta | Activar FB-05                                  |
| 2    | Campo `categoria` presente y válido           | Normalizar a `OTRO`; marcar human_review       |
| 3    | Campo `severidad` presente y válido           | Normalizar a `MEDIO`; marcar human_review      |
| 4    | Campo `confidence_score` en rango [0.0, 1.0]  | Normalizar: clampear al rango válido           |
| 5    | Campo `requires_human_review` es boolean      | Normalizar: convertir a `True` si no es bool  |
| 6    | Campo `razonamiento_breve` ≤ 120 caracteres   | Truncar a 120 caracteres                       |
| 7    | Campo `version_prompt` presente               | Registrar ausencia en log; continuar           |

### 7.3 Normalización de valores inválidos

Cuando el LLM devuelve un valor de categoría o severidad que no pertenece a la taxonomía definida, el normalizador aplica el siguiente mapeo antes de elevar la clasificación al Motor de Reglas:

```python
# Mapeo de categorías no reconocidas
CATEGORIA_FALLBACK_MAP = {
    # Sinónimos comunes que podría generar el modelo
    "AGRESION": "VIOLENCIA",
    "HURTO": "ROBO_HURTO",
    "EMERGENCIA": "INCENDIO_EMERGENCIA",
    "VANDALISMO": "DAÑO_INFRAESTRUCTURA",
    "SOSPECHOSO": "COMPORTAMIENTO_SOSPECHOSO",
    # Cualquier otro valor no reconocido
    "__default__": "OTRO",
}

# Mapeo de severidades no reconocidas
SEVERIDAD_FALLBACK_MAP = {
    "URGENTE": "ALTO",
    "GRAVE": "ALTO",
    "LEVE": "BAJO",
    "MODERADO": "MEDIO",
    "__default__": "MEDIO",
}
```

### 7.4 Reglas del Motor de Reglas de Negocio aplicadas post-normalización

Una vez que el normalizador produce una `LLMRawResponse` válida, el **Motor de Reglas de Negocio** aplica las siguientes validaciones complementarias en orden:

| Regla | ID         | Descripción                                                                     | Efecto                                |
|-------|------------|---------------------------------------------------------------------------------|---------------------------------------|
| 1     | `BR-SEV-01`| Descripción contiene indicador de criticidad                                    | Elevar severidad a `CRITICO`          |
| 2     | `BR-SEV-02`| Descripción contiene indicador de alto riesgo                                   | Elevar severidad mínima a `ALTO`      |
| 3     | `BR-HUM-01`| `confidence_score < 0.60`                                                       | Forzar `requires_human_review = True` |
| 4     | `BR-HUM-02`| Severidad `CRITICO` + `confidence_score < 0.80`                                 | Forzar `requires_human_review = True` |
| 5     | `BR-NOT-01`| Severidad es `CRITICO` o `ALTO`                                                 | Activar notificación inmediata        |

---

## 8. Coherencia con artefactos existentes

| Artefacto                                    | Relación con este documento                                                        |
|----------------------------------------------|------------------------------------------------------------------------------------|
| Plan de Integración del LLM (v1.0)           | Este documento implementa los lineamientos de las secciones 3, 5 y 6 del plan     |
| Diagrama de Arquitectura del Chatbot (v1.0)  | Los componentes aquí especificados corresponden al Módulo LLM del diagrama C4      |
| Documento de Arquitectura del Sistema (C4)   | Los componentes se enmarcan en la capa C3 del backend central                      |
| EDT y cronograma                             | Corresponde a las tareas T057–T069 de los Sprints 3 y 4                            |

---

## 9. Anexos

### Anexo A. Artefactos asociados a este documento

| Artefacto                               | Ruta                                          | Propósito                                               |
|-----------------------------------------|-----------------------------------------------|---------------------------------------------------------|
| Ciclo de Vida de Prompts                | `docs/LLM/Ciclo_Vida_Prompts.drawio.xml`      | Diagrama del proceso de diseño, versión y uso de prompts |
| Estrategia de Fallback                  | `docs/LLM/Estrategia_Fallback_LLM.drawio.xml` | Diagrama de decisión del flujo de fallback              |
| Integración OpenAI — Diagrama C4        | `docs/LLM/Integracion_OpenAI_C4.drawio.xml`   | Diagrama de componentes de la integración con OpenAI    |
| Plantilla de prompt activa              | `app/integrations/messaging/llm/prompts/PROMPT-IA-CLAS-v1.0.json` | Plantilla vigente de clasificación  |
| Registro de prompts                     | `app/integrations/messaging/llm/prompts/registry.json` | Índice de todas las versiones             |

### Anexo B. Glosario

| Término               | Definición                                                                          |
|-----------------------|-------------------------------------------------------------------------------------|
| LLM                   | Modelo de lenguaje de gran escala (Large Language Model).                           |
| Prompt                | Instrucción estructurada enviada al modelo de lenguaje.                             |
| Fallback              | Mecanismo de respaldo que se activa cuando el flujo principal falla.                |
| Contrato de salida    | Schema Pydantic que define la estructura válida de la respuesta del LLM.            |
| Confidence score      | Puntuación de confianza (0.0–1.0) que el modelo asigna a su propia clasificación.   |
| Zona de incertidumbre | Condición donde el resultado del LLM no alcanza suficiente claridad operativa.      |
| Expediente único      | Registro consolidado del incidente que integra historial, evidencias y clasificación.|
| DefaultClassification | Clasificación conservadora aplicada cuando todos los reintentos se agotan.          |
| Taxonomía             | Conjunto cerrado y definido de categorías y severidades válidas en el sistema.      |
