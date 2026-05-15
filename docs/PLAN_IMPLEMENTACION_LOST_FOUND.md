# Plan de Implementacion del Modulo Lost & Found

## 1. Objetivo

Dejar operativo e integrado el modulo Lost & Found en SafeCampus PUCP para los roles:

- usuario de comunidad
- supervisor de seguridad
- administrador

Queda fuera de esta primera implementacion la experiencia especifica del rol operador y cualquier dependencia de app movil. Para no bloquear el flujo end-to-end, las acciones operativas minimas necesarias se reasignan temporalmente al supervisor desde la web, sin romper el modelo futuro del operador.

## 2. Diagnostico del estado actual

### Ya existe

- El esquema `sc_lost_found` ya existe en BD con tablas base: `categoria_objeto`, `caso_lost_found`, `historial_caso_lf`.
- El backend ya tiene modelos SQLAlchemy base para esas tres tablas en `apps/backend/app/models/sc_lost_found.py`.
- El sistema ya contempla permisos `lost_found.crear`, `lost_found.ver` y `lost_found.gestionar` en la DDL inicial.
- La web ya tiene la ruta comunidad `/lost-found`, pero solo como placeholder.
- La maqueta funcional de comunidad ya existe en `repo-safeCampus-UI-Base-Figma` y sirve como referencia de UI/UX.

### Falta o esta incompleto

- No existe API `lost-found` en FastAPI.
- No existen repositorios, servicios ni schemas Pydantic del modulo.
- No existen tipos compartidos del feature en `packages/shared-types`.
- El enum actual `estado_caso_lf` no cubre el flujo TO-BE completo: faltan al menos `CONFIRMADO` y `EN_CUSTODIA`.
- No existen las tablas nuevas del documento: `match_sugerido`, `comentario_caso_lf`, `participante_hilo_lf`, `custodia_objeto`, `configuracion_lf`.
- La pantalla web de comunidad no consume backend ni persiste datos.
- No existe superficie web operativa/admin especifica para Lost & Found.

## 3. Decision de alcance para esta primera entrega

### Roles habilitados en esta fase

- Comunidad: registro, consulta, busqueda, detalle, historial propio, respuesta a matches, chat comunitario.
- Supervisor: gestion completa operativa del modulo en web, incluyendo las acciones que el documento asigna al operador mientras no exista la app movil.
- Administrador: hereda supervison operativa y suma catalogos, configuracion, auditoria y plantillas.

### Reasignacion temporal de responsabilidades

Mientras no exista el rol operador en producto:

- El supervisor registrara custodia, devolucion, descarte y moderacion de chat.
- El administrador mantendra acceso de respaldo para soporte, auditoria y configuracion.
- La API y el modelo de permisos deben quedar preparados para reintroducir `operador` despues, sin cambiar contratos publicos.

## 4. Requisitos funcionales que deben entrar

### Comunidad

- Registrar casos `PERDIDO` y `ENCONTRADO` con categoria, descripcion, lugar, fecha, foto y metadatos adicionales.
- Consultar feed comunitario de casos activos.
- Buscar por categoria, texto libre, tipo, estado y atributos rapidos.
- Ver detalle publico de casos activos y detalle completo de casos propios.
- Confirmar o descartar matches sugeridos.
- Participar en chat comunitario por caso activo.
- Cancelar un caso propio.
- Consultar historial de sus propios casos.

### Supervisor

- Ver listado operativo completo y detalle extendido.
- Cambiar estados segun transiciones validas.
- Registrar ingreso a custodia.
- Registrar devolucion y descarte.
- Moderar comentarios.
- Consultar KPIs, auditoria y casos pendientes.
- Ajustar umbral de matching si se decide incluir configuracion en esta fase.

### Administrador

- Gestionar categorias y activacion/desactivacion.
- Consultar auditoria completa del modulo.
- Configurar parametros del modulo y plantillas notificables.

## 5. Modelo objetivo de negocio

### Estados del caso

El enum `estado_caso_lf` debe evolucionar para soportar el flujo TO-BE:

- `ABIERTO`
- `EN_REVISION`
- `CONFIRMADO`
- `EN_CUSTODIA`
- `DEVUELTO`
- `DESCARTADO`
- `CERRADO`

### Reglas clave

- Todo caso inicia en `ABIERTO`.
- `DEVUELTO` y `DESCARTADO` son estados preterminales; luego cierran el caso con motivo.
- Un caso `CERRADO` no admite nuevas transiciones.
- Cada cambio de estado debe persistir en `historial_caso_lf` y en auditoria.
- El timer de custodia depende de categoria: 15 dias general, 24 horas para perecibles.
- El matching v1 debe ser deterministico y explicable, no dependiente de LLM.

## 6. Brechas de datos y cambios de esquema

### Cambios obligatorios de base de datos

1. Extender `estado_caso_lf` con `CONFIRMADO` y `EN_CUSTODIA`.
2. Crear enums nuevos:
   - `estado_match_lf`
   - `motivo_cierre_lf`
   - `estado_custodia`
3. Agregar columnas nuevas a `caso_lost_found`:
   - `subcategoria`
   - `hora_aproximada`
   - `foto_adicional_urls`
   - `color_principal`
   - `marca`
   - `etiquetas`
   - `motivo_cierre`
   - `observaciones_cierre`
   - `ts_busqueda`
   - `conteo_comentarios`
4. Crear tablas nuevas:
   - `match_sugerido`
   - `comentario_caso_lf`
   - `participante_hilo_lf`
   - `custodia_objeto`
   - `configuracion_lf`

### Recomendacion de implementacion

- Gestionar estos cambios solo via Alembic.
- Actualizar `infra/db/enums.sql`, `infra/db/initial_DLL.sql` y la migracion de backend viva solo si el equipo mantiene ambos artefactos como referencia; la fuente operativa sigue siendo Alembic.
- Regenerar tipos de Supabase al final: `pnpm gen:types`.
- Actualizar modelos SQLAlchemy curados y ejecutar `pnpm db:model-coverage`.

## 7. Arquitectura objetivo por capa

### Backend FastAPI

Seguir el patron ya usado por Incidentes:

- `app/models/sc_lost_found.py`
- `app/repositories/lost_found_repository.py`
- `app/services/lost_found_service.py`
- `app/schemas/lost_found.py`
- `app/api/v1/lost_found.py`
- registro del router en `app/api/v1/router.py`

### Contratos recomendados

#### Comunidad

- `POST /api/v1/lost-found/casos`
- `GET /api/v1/lost-found/casos/feed`
- `GET /api/v1/lost-found/casos/mis`
- `GET /api/v1/lost-found/casos/{ref}`
- `POST /api/v1/lost-found/casos/{id}/fotos`
- `GET /api/v1/lost-found/casos/{id}/matches`
- `POST /api/v1/lost-found/matches/{id}/responder`
- `PATCH /api/v1/lost-found/casos/{id}/cancelar`
- `GET /api/v1/lost-found/casos/{id}/comentarios`
- `POST /api/v1/lost-found/casos/{id}/comentarios`
- `PATCH /api/v1/lost-found/casos/{id}/participacion`

#### Supervisor y administrador

- `GET /api/v1/lost-found/casos`
- `PATCH /api/v1/lost-found/casos/{id}/estado`
- `POST /api/v1/lost-found/casos/{id}/custodia`
- `GET /api/v1/lost-found/custodias`
- `PATCH /api/v1/lost-found/custodias/{id}`
- `POST /api/v1/lost-found/custodias/{id}/devolucion`
- `POST /api/v1/lost-found/custodias/{id}/descarte`
- `PATCH /api/v1/lost-found/comentarios/{id}/visibilidad`
- `GET /api/v1/lost-found/kpis`
- `GET /api/v1/lost-found/configuracion`
- `PATCH /api/v1/lost-found/configuracion/{key}`

### Matching engine v1

Implementar como servicio backend sincronico o semiasincronico disparado al crear/actualizar casos.

Scoring base segun documento:

- categoria: `0.25`
- similitud textual: `0.30`
- proximidad geografica: `0.20`
- proximidad temporal: `0.15`
- metadatos: `0.10`

Reglas de v1:

- umbral inicial `0.55`
- solo cruzar `PERDIDO` vs `ENCONTRADO`
- persistir score total y detalle por criterio
- generar notificacion solo para matches sugeribles
- permitir un match confirmado por caso; el resto queda descartado o reabierto segun resultado

### Notificaciones

Integrar con `sc_notificaciones` existente para eventos minimos:

- caso creado
- match sugerido
- match confirmado
- match descartado
- custodia proxima a vencer
- caso cerrado
- comentario nuevo en hilo suscrito

### Auditoria

Integrar con `sc_auditoria.registro_auditoria` usando eventos `LF_*`.

Minimo obligatorio:

- `LF_CASO_CREADO`
- `LF_ESTADO_CAMBIADO`
- `LF_MATCH_GENERADO`
- `LF_MATCH_RESPONDIDO`
- `LF_CUSTODIA_REGISTRADA`
- `LF_DEVOLUCION_REGISTRADA`
- `LF_DESCARTE_REGISTRADO`
- `LF_COMENTARIO_CREADO`
- `LF_COMENTARIO_MODERADO`
- `LF_CONFIG_ACTUALIZADA`

## 8. Arquitectura objetivo en web

### Estructura del feature

Crear el feature real en `apps/web/src/features/lost-found/` con el mismo patron de Incidentes:

- `types.ts`
- `service.ts` para lecturas server-side
- `client.ts` para mutaciones
- `presentation.ts` para mapeos de tono/estado
- `components/*`

### Superficies de UI

#### Comunidad

- Reemplazar el placeholder de `/lost-found` por una vista real con:
  - tabs `Perdidos` y `Encontrados`
  - feed filtrable
  - formulario de nuevo caso
  - detalle de caso
  - vista de matches del usuario
  - chat comunitario por caso
  - historial de casos propios

#### Supervisor

Agregar rutas web operativas del modulo dentro de `(operativo)`:

- `/lost-found-operaciones` o `/lost-found` dentro del shell operativo
- `/lost-found/[id]`
- `/lost-found/kpis`

#### Administrador

Agregar superficies de administracion:

- catalogo de categorias
- configuracion del modulo
- acceso filtrado a auditoria LF

### Decision de UX para esta fase

- La comunidad mantiene experiencia tipo PWA.
- Supervisor y admin operan en layout desktop existente.
- No se construye experiencia movil especifica para operador.

## 9. Fases de implementacion

### Fase 0. Fundacion tecnica

- Cerrar definicion de alcance fase 1 con reasignacion temporal supervisor-operador.
- Diseñar migracion Alembic completa del esquema LF.
- Actualizar enums backend y modelos SQLAlchemy.
- Regenerar `database.types.ts`.
- Crear tipos compartidos del feature en `packages/shared-types`.

**Resultado:** base de datos, contratos y tipos preparados.

### Fase 1. Comunidad core

- API para crear caso, listar feed, listar propios y obtener detalle.
- Carga de foto principal y soporte para fotos adicionales.
- UI comunidad funcional para registro, feed, busqueda y detalle.
- Historial propio y cancelacion de caso propio.

**Resultado:** la comunidad ya puede registrar y consultar Lost & Found con persistencia real.

### Fase 2. Matching y notificaciones

- Implementar motor de matching v1.
- Persistir `match_sugerido`.
- Exponer bandeja de matches del usuario.
- Permitir confirmar y descartar coincidencias.
- Generar notificaciones `push/in-app/email` segun disponibilidad actual.

**Resultado:** se habilita el flujo automatico de sugerencia y confirmacion.

### Fase 3. Operacion por supervisor

- Panel operativo LF para supervisor.
- Cambio de estado con reglas de transicion.
- Registro de custodia, devolucion y descarte por supervisor.
- Notas operativas, historial extendido y vista de auditoria filtrada.
- Moderacion de chat.

**Resultado:** el modulo queda operable sin operador movil, usando supervisor como actor operativo temporal.

### Fase 4. Admin y hardening

- Catalogo de categorias.
- Configuracion de parametros LF.
- KPIs y reportes basicos.
- Cobertura de pruebas, observabilidad y cierre de huecos de permisos.

**Resultado:** administracion, analitica y soporte listos para puesta en operacion.

## 10. Flujos end-to-end que deben quedar cubiertos

### E2E-01 Registro de perdido

1. Usuario autenticado crea caso `PERDIDO`.
2. Backend valida, genera codigo `LF-YYYYMM-NNNNN` y guarda historial.
3. Caso aparece en su historial y en feed segun reglas de visibilidad.

### E2E-02 Registro de encontrado

1. Usuario autenticado crea caso `ENCONTRADO`.
2. Sistema dispara matching contra perdidos activos.
3. Si no hay match, el caso queda `ABIERTO`.

### E2E-03 Match sugerido y confirmacion

1. Se detecta match `>= 0.55`.
2. Se crea `match_sugerido` y se notifica al reportante del perdido.
3. Usuario confirma o descarta.
4. Si confirma, el caso pasa a `CONFIRMADO`.

### E2E-04 Custodia y devolucion por supervisor

1. Supervisor recibe fisicamente objeto y registra custodia.
2. Caso pasa a `EN_CUSTODIA`.
3. Usuario se presenta y supervisor registra verificacion.
4. Se registra devolucion, luego cierre.

### E2E-05 Vencimiento y descarte

1. Caso en custodia alcanza vencimiento.
2. Sistema notifica proximidad y luego vencimiento.
3. Supervisor registra descarte o donacion.
4. Caso pasa a `DESCARTADO` y luego `CERRADO`.

### E2E-06 Chat comunitario moderado

1. Usuario comenta en caso activo.
2. Participante suscrito recibe notificacion.
3. Supervisor puede ocultar comentario con motivo.

## 11. Orden recomendado de construccion

1. Migracion y tipos compartidos.
2. API base de casos.
3. UI comunidad para registro/feed/detalle.
4. Matching v1.
5. Notificaciones.
6. Operacion supervisor y custodia.
7. Chat comunitario.
8. Admin, auditoria y KPIs.

Este orden minimiza riesgo porque primero habilita persistencia y luego agrega inteligencia y operacion.

## 12. Riesgos y decisiones pendientes

### Riesgos

- El documento asigna varias acciones al operador, pero esta fase no contara con ese rol en producto.
- La tabla actual y enums actuales son insuficientes para el flujo TO-BE, por lo que la migracion es inevitable.
- El matching requiere combinar texto, tiempo y geografia; si faltan coordenadas o metadatos, la calidad inicial puede bajar.
- El chat y las fotos adicionales elevan el alcance si se intentan junto con todo lo demas desde el inicio.

### Decisiones que conviene cerrar antes de construir

1. Si el supervisor asumira formalmente todas las acciones operativas del operador en fase 1.
2. Si el chat comunitario entra en la primera salida productiva o en una segunda ola.
3. Si la notificacion push ya esta disponible para web/PWA o si se arranca con `in-app + email`.
4. Si los KPIs y exportaciones son obligatorios para el go-live o pueden salir despues del core operativo.

## 13. Criterio de salida para considerar el modulo operativo

Se considera operativo cuando se cumpla todo lo siguiente:

- Comunidad puede crear, buscar y seguir casos reales.
- Existe matching persistido y respuesta del usuario.
- Supervisor puede gestionar estados, custodia, devolucion y descarte desde web.
- Admin puede ver auditoria y configurar al menos categorias y umbral de matching.
- Todas las transiciones quedan auditadas e historizadas.
- Existen pruebas backend y web sobre los flujos criticos.

## 14. Validacion recomendada

### Backend

- `pnpm test:backend`
- `pnpm db:model-coverage`

### Web

- `pnpm --filter @safecampus/web typecheck`
- `pnpm --filter @safecampus/web test`
- `pnpm --filter @safecampus/web test:e2e`

### Integracion

- flujo manual comunidad -> matching -> supervisor -> cierre
- validacion de permisos por rol `comunidad`, `supervisor`, `administrador`
