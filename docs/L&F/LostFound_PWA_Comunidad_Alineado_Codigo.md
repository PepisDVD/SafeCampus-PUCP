# Documento Técnico-Funcional

# Módulo Lost & Found - PWA Comunidad

## Versión alineada con el código actual de SafeCampus PUCP

Fecha de actualización: 30/05/2026

---

## 1. Propósito del documento

Este documento reemplaza la versión técnico-funcional preliminar del módulo Lost & Found para el rol Usuario de la comunidad, alineándola con el estado real del monorepo SafeCampus PUCP al 30/05/2026.

La versión preliminar describía una PWA objetivo sin acceso al código existente. Esta versión toma como fuente principal lo ya implementado en el backend FastAPI, la aplicación web Next.js y los tipos compartidos del monorepo. Los puntos funcionales pendientes se conservan como extensiones incrementales, no como contratos ya existentes.

El objetivo práctico es dejar una guía de implementación realista para continuar el módulo comunitario sin contradecir la arquitectura, rutas, endpoints y componentes ya disponibles.

---

## 2. Línea base real del monorepo

SafeCampus PUCP usa pnpm workspaces y Turborepo.

Stack relevante:

- Backend: Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL/PostGIS.
- Web: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui vía `@safecampus/ui-kit`.
- Tipos compartidos: `@safecampus/shared-types`.
- API browser/server web: `apps/web/src/lib/api/client.ts` y `apps/web/src/lib/api/server.ts`.

El módulo Lost & Found ya existe en tres capas:

- Base de datos y migraciones Alembic en `apps/backend/alembic/versions/20260514_0011_lost_found_operativo.py`, más seed/canonicalización de categorías.
- Backend en `apps/backend/app/api/v1/lost_found.py`, `services/lost_found_service.py`, `repositories/lost_found_repository.py`, `schemas/lost_found.py` y `models/sc_lost_found.py`.
- Frontend web en `apps/web/src/features/lost-found/` y rutas de App Router para comunidad, operativo y admin.

La ruta comunitaria real es:

- `apps/web/src/app/(comunidad)/lost-found/page.tsx`

El componente comunitario actual es:

- `apps/web/src/features/lost-found/components/lost-found-community.tsx`

---

## 3. Principio de alineamiento

Para esta versión se prioriza lo implementado sobre lo propuesto originalmente.

Reglas de interpretación:

1. Si el código ya define un endpoint, payload, enum o ruta, esta versión documenta ese contrato real.
2. Si el documento preliminar pedía una ruta distinta, se marca como diferencia y se mantiene el contrato actual salvo que exista una razón técnica para migrarlo.
3. Si una funcionalidad aparece parcialmente implementada, se documenta como "parcial" y se propone la extensión mínima compatible.
4. Si una funcionalidad no existe en el código, se documenta como pendiente y se ubica en el plan incremental.

---

## 4. Estado funcional actual para comunidad

### 4.1 Funcionalidades ya disponibles

El rol comunidad ya cuenta con una superficie funcional inicial en `/lost-found`.

Funcionalidades disponibles:

| Funcionalidad | Estado actual | Implementación |
|---|---:|---|
| Abrir módulo Lost & Found desde shell comunidad | Implementado | `comunidad-shell.tsx` incluye navegación a `/lost-found`. |
| Cargar categorías | Implementado | `GET /api/v1/lost-found/categorias`. |
| Cargar feed comunitario | Implementado | `GET /api/v1/lost-found/casos/feed`. |
| Cargar casos propios | Implementado | `GET /api/v1/lost-found/casos/mis`. |
| Registrar caso perdido/encontrado | Implementado parcial | `POST /api/v1/lost-found/casos`; formulario actual no sube imagen. |
| Ver detalle de caso | Implementado parcial | `GET /api/v1/lost-found/casos/{ref}`; se abre inline en la pantalla actual. |
| Ver matches sugeridos | Implementado | `GET /api/v1/lost-found/casos/{id}/matches`. |
| Confirmar o descartar match | Implementado | `POST /api/v1/lost-found/matches/{id}/responder`. |
| Publicar comentario | Implementado | `POST /api/v1/lost-found/casos/{id}/comentarios`. |
| Listar comentarios | Implementado | Incluido en detalle y disponible por endpoint dedicado. |
| Suscribirse o silenciar participación | Backend implementado | `PATCH /api/v1/lost-found/casos/{id}/participacion`; falta UI comunitaria completa. |
| Cancelar caso propio | Backend y cliente implementados | `PATCH /api/v1/lost-found/casos/{id}/cancelar`; falta acción visible completa en UI comunidad. |

### 4.2 Funcionalidades pendientes o incompletas

| Funcionalidad | Brecha actual |
|---|---|
| Registro con fotografía obligatoria | El formulario comunitario no tiene input de archivo. El endpoint multipart `/fotos/upload` existe, pero hoy está restringido a roles operativo/supervisor/admin. |
| Fotos adicionales | El backend permite `foto_adicional_urls` y endpoint de fotos, pero falta flujo comunitario robusto. |
| Validación de fecha no futura ni mayor a 90 días | No está implementada en el cliente comunitario actual. |
| Validación de imagen por tipo, peso y dimensiones | No está implementada en el cliente comunitario actual. |
| Feed con scroll infinito por cursor | El feed comunitario actual usa límite simple, sin cursor. El cursor existe en listado operativo. |
| Filtros completos | Actualmente hay búsqueda por texto y tipo. Faltan filtros por categoría, lugar, rango de fecha, color y geolocalización. |
| Vista separada de detalle | Actualmente el detalle se muestra inline. El documento objetivo propone ruta semántica por caso. |
| Historial visible en casos propios | El backend devuelve historial si el usuario es propietario, pero la UI comunitaria no lo presenta de forma completa. |
| Chat con respuestas anidadas | El modelo actual tiene comentarios planos; no hay `parent_id`. |
| Eliminación propia dentro de 5 minutos | No existe endpoint específico para eliminación comunitaria; solo moderación operativa de visibilidad. |
| Gestión visible de participación/silenciado | Endpoint existe, falta UI. |
| PWA instalable, manifest, service worker y push web | No se observa implementación PWA completa ni web push en `apps/web`. Sí existe centro de notificaciones in-app. |
| Privacidad estricta de reportante público | El backend devuelve `UsuarioMini` con nombre completo y email cuando están disponibles. Debe endurecerse para casos ajenos. |

---

## 5. Contratos de API reales

Base URL en cliente web:

- `NEXT_PUBLIC_API_URL` o `http://localhost:8000/api/v1`.

Grupo de endpoints:

- `/api/v1/lost-found`

### 5.1 Endpoints comunitarios actuales

| Método | Endpoint | Uso comunidad | Observaciones |
|---|---|---|---|
| GET | `/lost-found/categorias` | Catálogo de categorías | Público/autenticado según cliente; soporta `include_inactive` para admin. |
| POST | `/lost-found/casos` | Crear caso | Requiere usuario autenticado. |
| GET | `/lost-found/casos/feed` | Feed comunitario | Endpoint real para comunidad. |
| GET | `/lost-found/casos/mis` | Casos propios | Usa usuario autenticado. |
| GET | `/lost-found/casos/{ref}` | Detalle | `ref` puede ser UUID o código. |
| POST | `/lost-found/casos/{id}/fotos` | Actualizar URLs de fotos | Permitido a propietario u operativo; recibe URLs, no archivos. |
| GET | `/lost-found/casos/{id}/matches` | Matches del caso | Permitido a propietario u operativo. |
| POST | `/lost-found/matches/{id}/responder` | Confirmar/descartar match | Permitido al reportante del caso perdido u operativo. |
| GET | `/lost-found/casos/{id}/comentarios` | Listar comentarios | Comentarios visibles para comunidad. |
| POST | `/lost-found/casos/{id}/comentarios` | Crear comentario | Caso debe estar en estado activo según backend actual. |
| PATCH | `/lost-found/casos/{id}/participacion` | Suscribirse/silenciar hilo | Backend implementado. |
| PATCH | `/lost-found/casos/{id}/cancelar` | Cancelar caso propio | Backend implementado. |

### 5.2 Endpoints operativos no comunitarios

Estos endpoints existen, pero están restringidos a roles supervisor/administrador según el código actual:

| Método | Endpoint | Rol actual |
|---|---|---|
| GET | `/lost-found/casos` | Operativo/supervisor/admin |
| PATCH | `/lost-found/casos/{id}/estado` | Operativo/supervisor/admin |
| POST | `/lost-found/casos/{id}/fotos/upload` | Operativo/supervisor/admin |
| POST | `/lost-found/casos/{id}/custodia` | Operativo/supervisor/admin |
| GET | `/lost-found/custodias` | Operativo/supervisor/admin |
| PATCH | `/lost-found/custodias/{id}` | Operativo/supervisor/admin |
| POST | `/lost-found/custodias/{id}/devolucion` | Operativo/supervisor/admin |
| POST | `/lost-found/custodias/{id}/descarte` | Operativo/supervisor/admin |
| PATCH | `/lost-found/comentarios/{id}/visibilidad` | Operativo/supervisor/admin |
| GET | `/lost-found/kpis` | Operativo/supervisor/admin |
| GET | `/lost-found/configuracion` | Operativo/supervisor/admin |
| PATCH | `/lost-found/configuracion/{key}` | Administrador |

### 5.3 Diferencia importante con el documento preliminar

El documento preliminar proponía usar `GET /api/v1/lost-found/casos` como listado y búsqueda comunitaria. En el código actual ese endpoint es operativo. Para comunidad se debe mantener `GET /api/v1/lost-found/casos/feed` y extenderlo con filtros/cursor si se decide completar el alcance.

---

## 6. Modelo de datos y enums reales

### 6.1 Caso Lost & Found

El caso se modela en `sc_lost_found.caso_lost_found` y se expone mediante `CasoLfListItem` y `CasoLfDetail`.

Campos relevantes:

- `id`
- `codigo`
- `tipo`: `PERDIDO` o `ENCONTRADO`
- `estado`
- `titulo`
- `descripcion`
- `categoria_id`
- `categoria_nombre`
- `subcategoria`
- `lugar_referencia`
- `fecha_evento`
- `hora_aproximada`
- `foto_url`
- `foto_adicional_urls`
- `color_principal`
- `marca`
- `etiquetas`
- `contacto_info`
- `latitud`
- `longitud`
- `reportante`
- `historial`
- `comentarios`

### 6.2 Estados reales del caso

Los estados disponibles en código son:

| Estado | Uso |
|---|---|
| `ABIERTO` | Caso creado y visible. |
| `EN_REVISION` | Caso con revisión o match pendiente. |
| `CONFIRMADO` | Match confirmado. |
| `EN_CUSTODIA` | Objeto gestionado físicamente por operación. |
| `DEVUELTO` | Objeto devuelto. |
| `DESCARTADO` | Objeto descartado. |
| `CERRADO` | Estado terminal. |

### 6.3 Motivo de cierre real

El código usa:

- `CANCELADO_USUARIO`
- `DEVUELTO`
- `DESCARTADO`
- `DONADO`
- `ADMINISTRATIVO`

La versión preliminar mencionaba `CANCELACION_USUARIO`. Para mantener compatibilidad con el backend, el término correcto en código es `CANCELADO_USUARIO`.

### 6.4 Código único real

El código generado actualmente sigue el formato:

- `LF-YYYYMM-XXXXX`

La versión preliminar proponía `LF-YYYYMMDD-XXXXX`. No debe cambiarse sin migración/decisión explícita, porque el backend ya implementa el formato mensual.

---

## 7. Flujos alineados con implementación actual

### 7.1 Ingreso al módulo

Ruta:

- `/lost-found`

Flujo actual:

1. La página server component carga bootstrap con categorías, feed, casos propios y ubicaciones.
2. Renderiza `LostFoundCommunity`.
3. La UI muestra tres pestañas: Feed, Nuevo y Mis casos.

Contrato usado:

- `GET /lost-found/categorias`
- `GET /lost-found/casos/feed`
- `GET /lost-found/casos/mis`
- `GET /maestros/ubicaciones`

### 7.2 Registro de caso

Estado actual:

- Implementado parcialmente.

Flujo real:

1. El usuario abre la pestaña Nuevo.
2. Selecciona tipo `PERDIDO` o `ENCONTRADO`.
3. Completa título, descripción, categoría, ubicación, color y marca.
4. El cliente valida título, descripción, categoría y lugar.
5. El cliente invoca `POST /lost-found/casos`.
6. El backend crea el caso en estado `ABIERTO`, genera código e intenta generar matches.
7. La UI refresca feed y casos propios.

Payload real principal:

```json
{
  "tipo": "PERDIDO",
  "titulo": "Mochila negra",
  "descripcion": "Descripción del objeto",
  "categoria_id": "uuid",
  "lugar_referencia": "Biblioteca Central",
  "fecha_evento": "2026-05-30T17:00:00.000Z",
  "color_principal": "Negro",
  "marca": "Marca",
  "etiquetas": ["mochila", "negra"]
}
```

Brecha frente al objetivo:

- Falta captura/subida de foto desde comunidad.
- Falta validación de fecha e imagen.
- Falta formulario por pasos.
- Falta borrador local ante pérdida de conectividad.

### 7.3 Feed y búsqueda

Estado actual:

- Implementado parcialmente.

Flujo real:

1. El usuario entra a la pestaña Feed.
2. Ve tarjetas de casos.
3. Puede buscar por texto y filtrar por tipo.
4. Al abrir una tarjeta se carga el detalle.

Endpoint real:

- `GET /lost-found/casos/feed?search=&tipo=&estado=&categoria_id=&limit=`

Brecha frente al objetivo:

- Falta cursor comunitario.
- Faltan filtros por categoría visible en UI, lugar, rango de fechas, color y radio geográfico.
- El backend incluye actualmente `CONFIRMADO` y `EN_CUSTODIA` en el feed por defecto. Si se desea seguir estrictamente la UX comunitaria propuesta, el feed por defecto debe limitarse a `ABIERTO` y `EN_REVISION`.

### 7.4 Detalle de caso

Estado actual:

- Implementado parcialmente.

Flujo real:

1. El usuario abre un caso desde el feed o sus casos.
2. El cliente invoca `GET /lost-found/casos/{ref}`.
3. Se muestra detalle inline debajo de las pestañas.
4. Si existen matches, se muestra panel de coincidencias.
5. Se muestra chat comunitario.

Regla backend actual:

- Si el caso está `CERRADO`, solo propietario u operativo puede verlo.
- El historial solo se devuelve para propietario u operativo.

Brecha frente al objetivo:

- Falta ruta de detalle dedicada.
- Falta presentación completa de historial propio.
- Falta privacidad estricta para datos de reportante en casos ajenos.
- Falta bloque específico de coordinación cuando el estado es `CONFIRMADO`.

### 7.5 Matches sugeridos

Estado actual:

- Implementado.

Flujo real:

1. Al crear caso, el backend ejecuta matching contra casos complementarios.
2. Si hay coincidencias con score suficiente, crea registros `match_sugerido`.
3. El usuario puede consultar matches desde el detalle si es propietario del caso.
4. Puede confirmar o descartar con `POST /lost-found/matches/{id}/responder`.
5. Si confirma, el backend marca ambos casos como `CONFIRMADO`.
6. Si descarta, el caso perdido vuelve a `ABIERTO`.

Brecha frente al objetivo:

- Falta UI más explícita de afinidad/desglose.
- Falta notificación push/email de match sugerido.
- Falta manejo visual de "solo un match confirmado" aunque el backend ya centraliza la respuesta.

### 7.6 Chat comunitario

Estado actual:

- Implementado parcialmente como comentarios planos.

Flujo real:

1. El detalle incluye comentarios.
2. El usuario escribe un comentario.
3. El cliente invoca `POST /lost-found/casos/{id}/comentarios`.
4. El backend registra el comentario, incrementa contador y suscribe al usuario al hilo.
5. Se crean notificaciones in-app para participantes suscritos.

Regla backend actual:

- Se permite comentar en estados definidos por `ACTIVE_STATES`: `ABIERTO`, `EN_REVISION`, `CONFIRMADO`, `EN_CUSTODIA`.

Brecha frente al objetivo:

- El documento preliminar restringe comentarios a `ABIERTO` y `EN_REVISION`.
- No hay respuestas anidadas.
- No hay eliminación propia dentro de 5 minutos.
- No hay UI para silenciar hilo.
- No hay paginación por cursor.

### 7.7 Mis casos e historial

Estado actual:

- Implementado parcialmente.

Flujo real:

1. La pestaña Mis casos usa `GET /lost-found/casos/mis`.
2. Muestra una lista corta de casos propios.
3. Al abrir un caso propio, el backend puede devolver historial.

Brecha frente al objetivo:

- La UI no presenta aún un historial de transiciones completo.
- Falta filtro por estado.
- Falta pantalla dedicada tipo `/lost-found/mis-casos`.

### 7.8 Cancelación de caso propio

Estado actual:

- Backend y cliente existen; UI comunitaria incompleta.

Contrato real:

- `PATCH /lost-found/casos/{id}/cancelar`

Payload:

```json
{
  "observaciones": "Ya encontré el objeto por otro medio."
}
```

Regla backend:

- Solo el reportante puede cancelar.
- No se puede cancelar si ya está `CERRADO`.
- El backend usa motivo `CANCELADO_USUARIO`.

Brecha frente al objetivo:

- Falta botón y diálogo de confirmación en el detalle comunitario.
- Falta mostrar observación/motivo de cierre en la UI de caso propio.

---

## 8. Seguridad y privacidad

### 8.1 Reglas ya aplicadas

- La creación de caso usa usuario autenticado.
- Los casos propios se filtran por `current_user.id`.
- Los matches solo pueden verse por propietario u operativo.
- La cancelación solo puede ejecutarla el propietario.
- Endpoints operativos usan `require_roles`.
- Los casos cerrados no son visibles para terceros comunitarios.

### 8.2 Ajustes pendientes recomendados

1. Endurecer privacidad de reportante para casos ajenos.
   - Para terceros comunitarios, mostrar solo primer nombre e inicial de apellido.
   - No exponer email ni avatar si no hay decisión explícita.

2. Separar detalle público vs detalle propio.
   - El backend ya tiene suficiente contexto (`usuario_id`, `roles`, `is_owner`) para filtrar campos.

3. Revisar estados comentables.
   - Si se adopta la regla del documento preliminar, limitar comentarios comunitarios a `ABIERTO` y `EN_REVISION`.

4. Permitir subida de fotos comunitaria de forma segura.
   - Autorizar upload al reportante propietario.
   - Validar MIME, tamaño, cantidad y estado del caso.
   - Mantener bucket/storage gestionado por backend.

---

## 9. PWA y notificaciones

### 9.1 Estado actual

La web tiene una experiencia mobile-first para comunidad y un centro de notificaciones in-app. Sin embargo, no se observa implementación completa de:

- manifest web app;
- service worker;
- modo offline;
- cola de reintentos;
- Web Push API;
- solicitud contextual de permisos push.

### 9.2 Alcance recomendado

PWA debe tratarse como fase posterior al cierre funcional de registro/feed/detalle, porque requiere decisiones transversales sobre service worker, caché, invalidación y notificaciones.

Orden sugerido:

1. Manifest e íconos institucionales.
2. Estrategia básica offline/read-only para shell y estados de error.
3. Borrador local para formulario de Lost & Found.
4. Integración Web Push con el servicio de notificaciones.
5. Evento destacado para match sugerido.

---

## 10. Plan de implementación alineado

### Fase A - Corrección de contratos y privacidad

Objetivo: eliminar contradicciones entre documento, backend y frontend.

Tareas:

- Mantener `/lost-found/casos/feed` como endpoint comunitario.
- Documentar `/lost-found/casos` como operativo.
- Ajustar privacidad de `CasoLfDetail` para casos ajenos.
- Corregir estados por defecto del feed comunitario si se desea seguir la regla `ABIERTO` + `EN_REVISION`.
- Decidir si el chat comunitario se restringe a `ABIERTO` + `EN_REVISION`.

### Fase B - Registro comunitario completo

Objetivo: completar RF-LF-01 a RF-LF-06 con el contrato real.

Tareas:

- Convertir el formulario actual en flujo por pasos.
- Agregar foto principal obligatoria.
- Permitir hasta 3 fotos adicionales.
- Habilitar upload comunitario seguro o crear endpoint específico para reportante.
- Validar descripción mínima de 20 caracteres si se adopta el estándar del documento preliminar.
- Validar fecha no futura ni anterior a 90 días.
- Guardar borrador local ante error de red.

### Fase C - Feed y búsqueda comunitaria

Objetivo: completar búsqueda y navegación mobile-first.

Tareas:

- Agregar filtros UI por categoría, lugar, fecha y color.
- Extender `/casos/feed` con cursor sobre `created_at`.
- Mostrar estado vacío accionable.
- Mantener tarjetas con foto, categoría, descripción truncada, lugar, fecha y badge.

### Fase D - Detalle, historial y cancelación

Objetivo: convertir el detalle inline en experiencia completa.

Tareas:

- Crear ruta dedicada de detalle si se decide seguir el diseño semántico.
- Mostrar historial solo para casos propios.
- Agregar acción "Cancelar mi caso" con diálogo de confirmación.
- Mostrar bloque de coordinación para estado `CONFIRMADO`.

### Fase E - Matching comunitario

Objetivo: mejorar la experiencia ya conectada.

Tareas:

- Mostrar score y desglose de afinidad.
- Bloquear acciones sobre matches no sugeridos o ya respondidos.
- Refrescar ambos casos tras confirmación.
- Preparar evento de notificación in-app/push.

### Fase F - Chat y participación

Objetivo: completar reglas comunitarias de conversación.

Tareas:

- Agregar UI para silenciar/reactivar hilo.
- Agregar última lectura si se incorpora al modelo.
- Evaluar migración para `parent_id` si se requieren respuestas anidadas.
- Agregar endpoint de eliminación propia dentro de 5 minutos o adaptar moderación con reglas de propiedad.

### Fase G - PWA, push y hardening

Objetivo: convertir la experiencia mobile-first en PWA completa.

Tareas:

- Manifest.
- Service worker.
- Borradores offline.
- Push web.
- Pruebas e2e y accesibilidad.

---

## 11. Criterios de aceptación actualizados

La extensión comunitaria debe considerarse completa cuando:

1. El usuario comunidad pueda registrar casos `PERDIDO` y `ENCONTRADO` con foto principal y metadatos mínimos.
2. El feed comunitario use el endpoint real `/casos/feed` con filtros completos y paginación.
3. Los casos propios se consulten desde `/casos/mis` y muestren historial.
4. El detalle público no exponga datos sensibles del reportante.
5. El usuario pueda cancelar solo sus propios casos no cerrados.
6. Los matches puedan confirmarse o descartarse desde casos propios.
7. El chat respete las reglas de estados y participación definidas.
8. La UI comunitaria use componentes de `@safecampus/ui-kit` y mantenga diseño mobile-first.
9. La PWA tenga estrategia definida para instalación, offline básico y notificaciones push.
10. Backend y frontend mantengan los contratos existentes salvo migración explícita.

---

## 12. Resumen ejecutivo

El módulo Lost & Found comunitario no parte de cero. Ya existe una base funcional conectada a backend y tipos compartidos: ruta `/lost-found`, feed, creación básica, casos propios, detalle, comentarios, matches y cancelación a nivel de cliente/backend.

La prioridad no debe ser reimplementar el módulo desde el documento preliminar, sino completar las brechas reales: fotos comunitarias, validaciones, privacidad, filtros, detalle propio, cancelación visible, participación de hilos y capacidades PWA.

La decisión arquitectónica principal es conservar los endpoints comunitarios actuales (`/casos/feed` y `/casos/mis`) y extenderlos, en lugar de mover comunidad hacia `/casos`, que hoy está correctamente reservado para operación.

Fin del documento.
