# Lost & Found — Documentación funcional por superficie

> **Propósito.** Documentar **todas las funcionalidades** del módulo Lost & Found
> **a partir del código actual**, separadas por las cuatro superficies de uso:
> Web Administrador, Web Supervisor (operativo), App Móvil (operadores) y
> PWA Comunidad.
>
> **Fuente de verdad:** el código del monorepo.
> - Web: [`apps/web/src/features/lost-found/`](../../apps/web/src/features/lost-found/)
>   (cliente HTTP [`client.ts`](../../apps/web/src/features/lost-found/client.ts),
>   carga server [`service.ts`](../../apps/web/src/features/lost-found/service.ts))
>   y rutas en [`apps/web/src/app/`](../../apps/web/src/app/).
> - Móvil: [`apps/mobile/src/features/operator/LostFoundScreen.tsx`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx).

---

## 0. Arquitectura, roles y control de acceso

### 0.1. Superficies y roles

| Superficie | Route group / app | Roles que acceden | Control de acceso |
|---|---|---|---|
| **Web Administrador** | `app/(admin)/lost-found-admin` | `administrador` | Layout exige rol `administrador`; resto redirige ([`(admin)/layout.tsx`](../../apps/web/src/app/(admin)/layout.tsx)) |
| **Web Supervisor (operativo)** | `app/(operativo)/lost-found-*` | `administrador`, `supervisor`, `operador` **habilitados** | Layout exige rol operativo; cada página llama `getLostFoundAccess()` y redirige a `/dashboard` si no tiene acceso ([`(operativo)/layout.tsx`](../../apps/web/src/app/(operativo)/layout.tsx)) |
| **App Móvil (operadores)** | `apps/mobile` | Operador de seguridad con acceso L&F | `GET /lost-found/acceso/mi`; la pestaña aparece solo si `acceso=true` |
| **PWA Comunidad** | `app/(comunidad)/lost-found` | Cualquier usuario de comunidad autenticado | Sin gate de L&F (feed público para la comunidad) |

> El **acceso de supervisores/operadores** al módulo lo concede el **administrador**
> en la pestaña *Custodia → Acceso al módulo* (`PUT /lost-found/acceso/supervisores`).
> Los administradores siempre tienen acceso. La app móvil y la web operativa
> comparten el mismo endpoint `GET /lost-found/acceso/mi`.

### 0.2. Estados del dominio (compartidos)

Definidos en [`presentation.ts`](../../apps/web/src/features/lost-found/presentation.ts) y tipos
([`api.ts`](../../apps/mobile/src/shared/types/api.ts) en móvil / `@safecampus/shared-types` en web):

- **Estado del caso (hilo):** `ABIERTO → EN_REVISION → CONFIRMADO → EN_CUSTODIA →
  DEVUELTO / DESCARTADO / CERRADO`.
- **Estado de custodia (logística):** `ACTIVA → PROXIMA_VENCER → VENCIDA →
  DEVUELTA / DESCARTADA`.
- **Tipo de caso:** `PERDIDO` | `ENCONTRADO`.
- **Origen del caso:** `COMUNIDAD` | `OPERADOR_MOVIL`.

### 0.3. Conceptos transversales

- **Categorías con metadatos dinámicos** (`metadatos_schema.campos`): cada campo
  tiene `codigo/etiqueta/tipo (texto|numero)/requerido/participa_en_matching/activo`.
- **Matching**: el backend sugiere coincidencias entre casos perdidos y
  encontrados según un **umbral** configurable (0.00–1.00).
- **Política de custodia**: plazos (días máximos, alerta de vencimiento,
  recordatorio, y horas para perecibles) configurables por el administrador.
- **Comentarios tipo foro**: anidados (hasta `comentarios_profundidad_maxima`, por
  defecto 6), con etiquetas, reacciones (destacar), fijado y moderación.
- **Etiquetas de comentario** según tipo del hilo
  ([`presentation.ts:103-118`](../../apps/web/src/features/lost-found/presentation.ts#L103-L118)):
  - En `PERDIDO`: *Comentario general*, *Creo que lo encontré* (POSIBLE_HALLAZGO), *Tengo una pista* (PISTA).
  - En `ENCONTRADO`: *Comentario general*, *Creo que es mío / Quiero reclamarlo* (RECLAMO), *Tengo información útil* (INFO_UTIL).

---

## 1. Web — Administrador (Configuración)

**Pantalla:** [`lost-found-admin.tsx`](../../apps/web/src/features/lost-found/components/lost-found-admin.tsx).
**Ruta:** `/lost-found-admin` ([`(admin)/lost-found-admin/page.tsx`](../../apps/web/src/app/(admin)/lost-found-admin/page.tsx)).
**Carga server:** `getLostFoundAdminCategorias` / `getLostFoundAdminReglasOperativas`
([`service.ts:81-102`](../../apps/web/src/features/lost-found/service.ts#L81-L102)).

La configuración se organiza en **3 pestañas**: Categorías · Reglas operativas · Custodia.

### 1.1. Categorías (`CategoriasTab`)
Catálogo de categorías de objetos con su esquema de metadatos.

| Funcionalidad | Detalle / Endpoint |
|---|---|
| Listar categorías (incluye inactivas) | `GET /lost-found/categorias?include_inactive=true` |
| Buscar (nombre/código), filtrar por estado, ordenar (nombre/orden visual) | Cliente |
| Crear categoría | `POST /lost-found/categorias` |
| Editar categoría | `PATCH /lost-found/categorias/{id}` |
| Activar/Desactivar | `PATCH` con `activa` toggled |
| **Gestión de metadatos por categoría** (`CategoryDrawer`/`MetadatoAccordionItem`) | Agregar/editar/quitar campos: `etiqueta`, `tipo` (texto/número), `requerido`, `participa_en_matching` (solo texto), `orden`, `activo`. El `codigo` se genera por slug y se bloquea tras persistir |
| Marcar categoría como **perecible** | Campo `es_perecible` (afecta política de custodia) |

### 1.2. Reglas operativas (`ReglasOperativasTab`)

**a) Matching** (`MatchingTab`):
- Configura el **umbral de sugerencia** (0.00–1.00). `GET/PUT /lost-found/matching/configuracion`.
- Validación: número entre 0 y 1; "guardar" solo si cambió.

**b) Política de custodia / ciclo de vida** (`PoliticaCicloVida`):
- `GET/PUT /lost-found/custodia/politica`.
- Parámetros (con rangos validados,
  [`lost-found-admin.tsx:553-573`](../../apps/web/src/features/lost-found/components/lost-found-admin.tsx#L553-L573)):
  `dias_maximos_custodia` (1–365), `dias_alerta_vencimiento` (0–90),
  `dias_recordatorio_previo` (0–90), y para perecibles
  `horas_maximas_perecibles` (1–168), `horas_alerta_perecible` (0–72).
- Reglas cruzadas: la alerta y el recordatorio deben ser menores al máximo; la
  alerta de perecibles menor a las horas máximas. No afecta custodias ya registradas.

**c) Motivos de cierre** (`MotivosCierre` / `MotivoCierreDrawer`):
- `GET /lost-found/motivos-cierre?include_inactive=true`,
  `POST /lost-found/motivos-cierre`, `PATCH /lost-found/motivos-cierre/{id}`.
- Cada motivo: `codigo` (mayúsculas, bloqueado tras crear), `nombre`,
  `descripcion`, `clase_cierre` (`DEVOLUCION` | `DESCARTE` | `ADMINISTRATIVO`),
  `requiere_observacion`, `requiere_validacion_entrega` (solo DEVOLUCION),
  `orden_visual`, `activo`.
- Los motivos ya usados solo pueden **desactivarse** (no eliminarse).

### 1.3. Custodia — Acceso al módulo (`SupervisoresAccesoTab`)
- Lista el personal operativo y su estado de acceso:
  `GET /lost-found/acceso/supervisores`.
- Activa/desactiva acceso por usuario (Switch) y guarda en lote:
  `PUT /lost-found/acceso/supervisores` con `usuario_ids`.
- Buscador por nombre/email. Nota visible: *"los administradores siempre tienen acceso"*.

---

## 2. Web — Supervisor (Operativo)

Superficie operativa compartida por **administrador, supervisor y operador
habilitado**. Tres sub-módulos: **Dashboard**, **Hilos** y **Logística**.

### 2.1. Dashboard (`lost-found-operativo.tsx`)
**Ruta:** `/lost-found-operaciones`. **Carga:** `getLostFoundOperativo` (rango por
defecto últimos 41 días). **Datos:** `GET /lost-found/dashboard` (recarga con
debounce al cambiar filtros).

| Bloque | Contenido |
|---|---|
| **Filtros** | Rango de fechas, categorías (multi), estados (multi), tipo (PERDIDO/ENCONTRADO/Todos) |
| **KPIs** | Casos totales, casos activos, en custodia, por vencer, tasa de recuperación (%), tiempo promedio de devolución (días); cada uno con variación vs. período anterior |
| **Gráficos** | Línea registrados vs devueltos; barras tiempo promedio en custodia por categoría; donas por categoría / por estado / por tipo; barras de antigüedad de casos |
| **Custodias críticas / por vencer** | Lista con días restantes y enlace a la custodia |
| **Actividad reciente** | Tabla de casos: código, objeto, tipo, estado, días en custodia, matching (confirmado / N sugerencias), reportante, acción "Ver caso" |

### 2.2. Hilos (`lost-found-threads.tsx`)
**Ruta:** `/lost-found-hilos`. **Carga:** `getLostFoundThreads`. Listado tipo tarjetas
con **scroll infinito** (cursor) e identificación de origen (Comunidad / Mobile).

**Listado y filtros** (`casosOperativo` → `GET /lost-found/casos`):
- Búsqueda por código/objeto/lugar/marca; filtros multi por tipo, estado,
  categoría y **origen** (Comunidad / Mobile); carga incremental con
  `IntersectionObserver`.

**Crear hilo** (`crearCaso` → `POST /lost-found/casos`):
- Formulario: tipo (Encontrado/Perdido), título, descripción (20–500 en este
  formulario), categoría, fecha del evento, ubicación (selección de
  **ubicación maestra** o manual + selector de coordenadas en **mapa Leaflet**),
  metadatos dinámicos de la categoría, y **fotos** (1 obligatoria, máx. 3).
- Tras crear, sube fotos (`subirFotosArchivos`) y navega al detalle del hilo.

#### 2.2.1. Detalle del hilo (`lost-found-thread-detail.tsx`)
**Ruta:** `/lost-found-hilos/{id}`. Carga el caso + matches.

| Capacidad | Quién | Endpoint |
|---|---|---|
| Ver publicación (imágenes en carrusel + **mapa** si hay coordenadas) | Todos | — |
| Tab "Información del hilo" (descripción, datos generales, metadatos de categoría) | Todos | — |
| Tab "Gestión operativa": nota + **cambiar estado** (En revisión / Confirmado / Cerrar) | Operativo | `PATCH /lost-found/casos/{id}/estado` |
| **Registrar custodia** (si no tiene) | Operativo | `POST /lost-found/casos/{id}/custodia` |
| Aviso de custodia vinculada (deriva a Logística) | — | enlaza a `/lost-found-logistica?search=` |
| **Cerrar / Reabrir** hilo | **Admin** | `PATCH /lost-found/casos/{id}/cierre` |
| **Ocultar / Mostrar** hilo a la comunidad | **Admin** | `PATCH /lost-found/casos/{id}/visibilidad` |
| **Editar hilo** | Admin o autor | modal `EditCaseModal` → `PATCH /lost-found/casos/{id}` |
| Ver **historial del caso** (transiciones, actor, motivo) | Operativo | drawer (campo `historial`) |
| **Coincidencias sugeridas** (score %) con Confirmar/Descartar | Operativo | `GET /lost-found/casos/{id}/matches`, `POST /lost-found/matches/{id}/responder` |
| **Hilo de conversación** (comentarios anidados, orden y filtro por etiqueta) | Todos (comentar si estado ABIERTO/EN_REVISION) | `comentar`, `editar`, `eliminar(gestion)`, `fijar`, `reaccion`, `visibilidad` |
| **Modo gestión** de comentarios (moderar/ocultar/eliminar/fijar) | **Admin** | `eliminarComentarioGestion`, `moderarComentario`, `fijarComentario` |

### 2.3. Logística (`lost-found-logistica.tsx`)
**Ruta:** `/lost-found-logistica`. **Carga:** `getLostFoundLogistica`. Gestión física
de objetos encontrados (custodia, devolución, descarte).

**Listado** (`custodias` → `GET /lost-found/custodias`):
- Filtros: búsqueda (código/objeto/ubicación/observación), estados (multi),
  vencimiento (vigente/próxima/vencida), paginación (10/20/50).
- Columnas: caso, objeto (regular/perecible), estado, ubicación, recepción,
  vencimiento (resaltado en rojo si vencido y activo).

**Acciones por custodia** (menú según estado):

| Acción | Estados aplicables | Endpoint |
|---|---|---|
| **Registrar objeto en custodia** | casos ENCONTRADO sin custodia | `POST /lost-found/casos/{id}/custodia` |
| **Editar custodia** (ubicación, observaciones, **fecha de vencimiento**) | ACTIVA/PROXIMA_VENCER/VENCIDA | `PATCH /lost-found/custodias/{id}` |
| **Ver trazabilidad** (timeline: publicación → custodia → historial → devolución) | todas | `detalle` del caso |
| **Registrar devolución** (asistente, §2.4) | operativas (ACTIVA/PROXIMA_VENCER) | `POST /lost-found/custodias/{id}/devolucion` |
| **Revertir devolución** (reabre el caso) | DEVUELTA | `POST /lost-found/custodias/{id}/revertir` |
| **Marcar como descartada** (motivo + destino + observaciones) | operativas/VENCIDA | `POST /lost-found/custodias/{id}/descarte` |
| **Reactivar custodia** (reabre el caso) | DESCARTADA | `POST /lost-found/custodias/{id}/reactivar` |

> Al registrar custodia el caso pasa a `EN_CUSTODIA`; descartar/devolver cierra o
> resuelve el caso; revertir/reactivar lo reabre. La **trazabilidad se conserva**
> en todos los casos.

### 2.4. Asistente de devolución (`return-registration-wizard.tsx`)
Flujo guiado para registrar la entrega del objeto a su dueño
(`devolver` → `POST /lost-found/custodias/{id}/devolucion`). Captura:
- **Reclamante**: tipo (`COMUNIDAD` con búsqueda de usuario / `VISITANTE` / `OTRO`),
  nombre, documento, email, teléfono.
- **Verificación**: métodos/evidencia (`CONFIRMACION_VERBAL`, `FIRMA`, `FOTO`,
  `CARGO_CONSTANCIA`, `OTRO`), detalle, **adjuntos de evidencia** (imágenes).
- **Entrega**: fecha/hora de handoff, entregado por, ubicación de entrega,
  condición del objeto (`BUENO` / `DESGASTE_PREVIO` / `OBSERVACIONES`).

---

## 3. App Móvil — Operadores

**Pantalla:** [`LostFoundScreen.tsx`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx).
Pestaña visible solo si `GET /lost-found/acceso/mi` → `acceso=true`. Enfoque: **recepción operativa en campo**.

### 3.1. Consulta
- **Caché en memoria** (TTL 60 s) + dedupe de peticiones concurrentes.
- Dos sub-pestañas:
  - **Custodias**: `GET /lost-found/custodias?estado=ACTIVA,PROXIMA_VENCER&...`
    (estado, ubicación, días en custodia).
  - **Mis registros**: `GET /lost-found/casos/mis?origen=OPERADOR_MOVIL&limit=80`
    (casos creados desde mobile).
- Categorías para el formulario: `GET /lost-found/categorias`.
- Detalle de caso/custodia de **solo lectura** (imágenes, metadatos, estado).

### 3.2. Registrar recepción (objeto encontrado)
`registerLostFoundMobileReception` → `POST /lost-found/mobile/recepciones`:
- Tipo fijo `ENCONTRADO`, etiqueta `OPERADOR_MOVIL`, `fecha_evento = ahora`.
- Campos: título, descripción, categoría, metadatos dinámicos, lugar de
  referencia, ubicación de custodia, observaciones, `es_perecible`.
- Validación de longitudes y requeridos
  ([`LostFoundScreen.tsx:609-622`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L609-L622)).
- Crea el caso **y su custodia** en un solo paso (resultado `caso` + `custodia`).

### 3.3. Evidencia multimedia
- Hasta **3 fotos** desde **cámara** (`expo-camera`) o **galería**
  (`expo-image-picker`), compresión `quality 0.75`.
- Subida: `uploadLostFoundCasePhotos` →
  `POST /lost-found/casos/{id}/fotos/upload` (multipart, campo `archivos`).

### 3.4. Diferencias vs. web
- Solo registra `ENCONTRADO` (no perdidos).
- **No** gestiona estados, comentarios, matches ni devoluciones.
- El registro entra al sistema con `origen=OPERADOR_MOVIL` y es visible en la web
  operativa (filtro "Mobile") y en la pestaña "Recepciones" de la comunidad.

---

## 4. PWA — Comunidad

**Pantalla:** [`lost-found-community.tsx`](../../apps/web/src/features/lost-found/components/lost-found-community.tsx).
**Ruta:** `/lost-found` ([`(comunidad)/lost-found/page.tsx`](../../apps/web/src/app/(comunidad)/lost-found/page.tsx)).
**Carga:** `getLostFoundBootstrap` (categorías + feed). Interfaz móvil/PWA para la comunidad.

### 4.1. Navegación por pestañas
- **Feed**: casos públicos de la comunidad (`GET /lost-found/casos/feed`).
- **Recepciones**: casos de origen operador móvil (`feed?origen=OPERADOR_MOVIL`).
- **Mis casos**: los del usuario (`GET /lost-found/casos/mis`), con filtro por estado.

### 4.2. Feed y búsqueda
- Búsqueda general + **filtros avanzados** (`LostFoundFeedFilters`): categorías,
  tipo, estado, presets de tiempo, y **filtro por ubicación + radio** (selector
  en mapa, `LostFoundLocationPicker`).
- Chips de filtros rápidos; **scroll infinito** por cursor (`loadMore`).

### 4.3. Crear caso (comunidad)
`crearCaso` → `POST /lost-found/casos`:
- Tipo (por defecto `PERDIDO`), título, descripción, categoría, fecha del evento,
  ubicación (maestra o manual + mapa Leaflet), metadatos dinámicos, y fotos
  (máx. 3).
- **Borrador autoguardado** en `localStorage` (`safecampus:lost-found:draft`).
- Tras crear: sube fotos, abre el detalle, y **solicita permiso de notificaciones
  del navegador** (`Notification.requestPermission`,
  [`lost-found-community.tsx:2032-2034`](../../apps/web/src/features/lost-found/components/lost-found-community.tsx#L2032-L2034)).

### 4.4. Detalle del caso (`CaseDetail`)
| Capacidad | Endpoint |
|---|---|
| Galería de imágenes con lightbox + mapa | — |
| **Comentar** (con etiqueta según tipo, hasta 3 imágenes, respuestas anidadas) | `POST /lost-found/casos/{id}/comentarios` |
| **Reaccionar / destacar** comentario | `POST /lost-found/comentarios/{id}/reaccion` |
| **Fijar / desfijar** comentario | `PATCH /lost-found/comentarios/{id}/fijar` |
| **Eliminar** comentario propio | `DELETE /lost-found/comentarios/{id}` |
| Ordenar y filtrar comentarios por etiqueta | cliente |
| **Responder coincidencias (matches)**: Confirmar / Descartar | `POST /lost-found/matches/{id}/responder` |
| **Editar** caso propio | `PATCH /lost-found/casos/{id}` (`EditCaseModal`) |
| **Cancelar** caso propio (con motivo) | `PATCH /lost-found/casos/{id}/cancelar` |
| Ver **historial** (solo casos propios) | campo `historial` |
| **Suscribirse / silenciar** el hilo (participación) | `PATCH /lost-found/casos/{id}/participacion` |

- Comentarios habilitados solo si `comentarios_habilitados !== false` y estado en
  `ABIERTO`/`EN_REVISION`; estados terminales (`CERRADO`/`DEVUELTO`/`DESCARTADO`)
  no permiten cancelar.
- Al abrir un hilo se marca participación/leído automáticamente
  (`actualizarParticipacion(id, true, true)`).

### 4.5. Notificaciones
- Usa la **Web Notifications API** del navegador (solicitud de permiso). La
  **push real al celular está pospuesta hasta tener HTTPS** (el service worker ya
  está listo; falta el cableado backend+frontend) — ver memoria
  [[lf-community-push-deferred]].

---

## 5. Catálogo consolidado de endpoints (web `client.ts`)

Referencia: [`client.ts`](../../apps/web/src/features/lost-found/client.ts). (`A`=Admin,
`S`=Supervisor/operativo, `M`=Móvil, `C`=Comunidad).

| Operación | Método y ruta | Superficies |
|---|---|---|
| Feed comunitario | `GET /lost-found/casos/feed` | C |
| Mis casos | `GET /lost-found/casos/mis` | C, M |
| Casos (operativo, filtros+cursor) | `GET /lost-found/casos` | S |
| Detalle de caso | `GET /lost-found/casos/{ref}` | S, C, M |
| Crear caso | `POST /lost-found/casos` | S, C |
| Actualizar caso | `PATCH /lost-found/casos/{id}` | S, C |
| Cancelar caso | `PATCH /lost-found/casos/{id}/cancelar` | C |
| Cambiar estado | `PATCH /lost-found/casos/{id}/estado` | S |
| Cerrar/Reabrir | `PATCH /lost-found/casos/{id}/cierre` | S(admin) |
| Ocultar/Mostrar | `PATCH /lost-found/casos/{id}/visibilidad` | S(admin) |
| Subir fotos (archivos) | `POST /lost-found/casos/{id}/fotos/upload` | S, C, M |
| Actualizar fotos (urls) | `POST /lost-found/casos/{id}/fotos` | S, C |
| Subir media | `POST /lost-found/casos/{id}/media` | S, C |
| Matches del caso | `GET /lost-found/casos/{id}/matches` | S, C |
| Responder match | `POST /lost-found/matches/{id}/responder` | S, C |
| Comentarios (listar) | `GET /lost-found/casos/{id}/comentarios` | S, C |
| Comentar | `POST /lost-found/casos/{id}/comentarios` | S, C |
| Reaccionar comentario | `POST /lost-found/comentarios/{id}/reaccion` | S, C |
| Fijar comentario | `PATCH /lost-found/comentarios/{id}/fijar` | S, C |
| Editar comentario | `PATCH /lost-found/comentarios/{id}` | S, C |
| Eliminar comentario (propio) | `DELETE /lost-found/comentarios/{id}` | C |
| Eliminar comentario (gestión) | `DELETE /lost-found/comentarios/{id}/gestion` | S(admin) |
| Moderar visibilidad comentario | `PATCH /lost-found/comentarios/{id}/visibilidad` | S(admin) |
| Participación en hilo | `PATCH /lost-found/casos/{id}/participacion` | C |
| Dashboard | `GET /lost-found/dashboard` | S |
| Custodias (listar) | `GET /lost-found/custodias` | S, M |
| Registrar custodia | `POST /lost-found/casos/{id}/custodia` | S |
| Actualizar custodia | `PATCH /lost-found/custodias/{id}` | S |
| Devolución | `POST /lost-found/custodias/{id}/devolucion` | S |
| Descarte | `POST /lost-found/custodias/{id}/descarte` | S |
| Revertir devolución | `POST /lost-found/custodias/{id}/revertir` | S |
| Reactivar descarte | `POST /lost-found/custodias/{id}/reactivar` | S |
| Recepción móvil | `POST /lost-found/mobile/recepciones` | M |
| Categorías | `GET /lost-found/categorias` | A, S, C, M |
| Crear/Actualizar categoría | `POST` / `PATCH /lost-found/categorias[/{id}]` | A |
| Motivos de cierre | `GET /lost-found/motivos-cierre` | A, S |
| Crear/Actualizar motivo | `POST` / `PATCH /lost-found/motivos-cierre[/{id}]` | A |
| Config. matching | `GET` / `PUT /lost-found/matching/configuracion` | A |
| Política de custodia | `GET` / `PUT /lost-found/custodia/politica` | A |
| Acceso supervisores | `GET` / `PUT /lost-found/acceso/supervisores` | A |
| Mi acceso | `GET /lost-found/acceso/mi` | S, M |
| Ubicaciones maestras | `GET /maestros/ubicaciones` | S, C |

---

## 6. Resumen comparativo por superficie

| Capacidad | Admin | Supervisor | Móvil | Comunidad |
|---|:--:|:--:|:--:|:--:|
| Configurar categorías/metadatos | ✅ | — | — | — |
| Configurar matching / política / motivos | ✅ | — | — | — |
| Conceder acceso al módulo | ✅ | — | — | — |
| Dashboard / KPIs | ✅ | ✅ | — | — |
| Crear caso | ✅* | ✅ | ✅ (encontrado) | ✅ |
| Cambiar estado del caso | ✅ | ✅ | — | — |
| Cerrar/Reabrir, Ocultar/Mostrar | ✅ | — | — | — |
| Registrar/editar custodia | ✅ | ✅ | ✅ (al recepcionar) | — |
| Devolución / descarte / revertir / reactivar | ✅ | ✅ | — | — |
| Responder matches | ✅ | ✅ | — | ✅ |
| Comentar / reaccionar / fijar | ✅ | ✅ | — | ✅ |
| Moderar comentarios (gestión) | ✅ | — | — | — |
| Editar/Cancelar caso propio | ✅ | ✅(editar) | — | ✅ |
| Subir evidencia fotográfica | ✅ | ✅ | ✅ | ✅ |
| Filtro/seguimiento por ubicación (mapa) | — | ✅ | — | ✅ |
| Suscripción a hilo / notificaciones | — | — | — | ✅ |

\* El administrador opera sobre la superficie operativa (mismo shell), por lo que
también puede crear/gestionar casos.
