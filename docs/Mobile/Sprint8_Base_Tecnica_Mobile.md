# SafeCampus PUCP — Sprint 8 · Base Técnica (App Móvil)

> **Propósito.** Servir de **insumo técnico** para redactar el documento oficial
> del Sprint 8. **No** contiene diagramas de flujo: describe la **implementación
> real** de la app móvil del operador, módulo por módulo, con referencias exactas
> a archivos y líneas.
>
> **Fuente de verdad (en este orden):**
> 1. **Código actual** en [`apps/mobile`](../../apps/mobile) (estructura, contratos
>    consumidos, comportamiento observable).
> 2. Contratos backend efectivamente invocados desde
>    [`shared/api/client.ts`](../../apps/mobile/src/shared/api/client.ts).
>
> **Alcance del Sprint 8:** integración de los módulos de negocio a la app móvil:
> Gestión de Incidentes, Lost & Found, Uploader Multimedia, Seguimiento de Casos,
> Receptor de Notificaciones Push, e Historial + Mapa móvil.
>
> **Leyenda de estado:** ✅ implementado · 🟡 parcial · ❌ ausente / pendiente.

---

## 0. Contexto y arquitectura base

- **Stack:** React Native + Expo `~54`, React `19.1`, TypeScript estricto.
  Dependencias clave en [`package.json`](../../apps/mobile/package.json):
  `expo-camera ~17`, `expo-image-picker ~17`, `expo-location ~19`,
  `expo-notifications ~0.32`, `expo-secure-store ~15`, `react-native-maps 1.20`,
  `@react-native-community/netinfo 11`.
- **Organización por features:** `src/features/<dominio>/`, transversal en
  `src/shared/`. Entrada: [`App.tsx`](../../apps/mobile/App.tsx) →
  [`OperatorApp.tsx`](../../apps/mobile/src/bootstrap/OperatorApp.tsx).
- **App mono-rol:** consola para **operadores de seguridad** de campo.
- **Capa HTTP central** [`http-client.ts`](../../apps/mobile/src/shared/api/http-client.ts):
  retry con backoff + timeout + circuit breaker; `401 → EXPIRED`; todos los
  servicios de dominio pasan por aquí (sin `fetch` directo desde pantallas).
- **Tipos de dominio** en [`shared/types/api.ts`](../../apps/mobile/src/shared/types/api.ts).
- **Resiliencia/fallbacks** (`FB-NET/5XX/401/AUTH/PERM/DATA`) en
  [`shared/fallback/`](../../apps/mobile/src/shared/fallback/).

### 0.1. Matriz de cobertura Sprint 8 (resumen)

| # | Módulo S8 | Estado | Pantalla/Hook principal |
|---|---|---|---|
| 1 | Gestión de Incidentes | ✅ | `IncidentsScreen` / `IncidentDetailScreen` / `useOperatorData` |
| 2 | Lost & Found | ✅ | `LostFoundScreen` |
| 3 | Uploader Multimedia | 🟡 | `LostFoundScreen` (cámara/galería + upload). Solo en L&F |
| 4 | Seguimiento de Casos | 🟡 | L&F "Mis registros" + detalle de incidente (polling) |
| 5 | Receptor de Notificaciones Push | 🟡 | `useIncidentAssignmentNotifications` (**locales**, no remotas) |
| 6 | Historial y Mapa Móvil | ✅ | `IncidentDetailScreen` (historial) + `MapScreen` / `useOperatorLocation` |

---

## 1. Gestión de Incidentes en la App Móvil ✅

### 1.1. Objetivo
Listar, filtrar, abrir y operar los incidentes **asignados al operador**
autenticado (`mios=true`), con cambio de estado y notas operativas.

### 1.2. Archivos
- Hook de datos: [`use-operator-data.ts`](../../apps/mobile/src/features/operator/use-operator-data.ts)
- Listado/filtros: [`IncidentsScreen.tsx`](../../apps/mobile/src/features/operator/IncidentsScreen.tsx)
- Detalle/acciones: [`IncidentDetailScreen.tsx`](../../apps/mobile/src/features/operator/IncidentDetailScreen.tsx)
- Tarjeta: [`IncidentCard.tsx`](../../apps/mobile/src/features/operator/IncidentCard.tsx)
- Resumen/KPIs: [`DashboardScreen.tsx`](../../apps/mobile/src/features/operator/DashboardScreen.tsx)
- Formato/labels: [`operator-format.ts`](../../apps/mobile/src/features/operator/operator-format.ts)

### 1.3. Contratos backend consumidos
Desde [`client.ts`](../../apps/mobile/src/shared/api/client.ts):

| Acción | Método y ruta |
|---|---|
| Listado (asignados) | `GET /incidentes/?mios=true&limit=80` |
| KPIs dashboard | `GET /incidentes/stats?mios=true` |
| Detalle | `GET /incidentes/{id}` |
| Cambio de estado | `PATCH /incidentes/{id}/estado` body `{ estado, comentario }` |
| Comentario/nota | `POST /incidentes/{id}/comentarios` body `{ contenido, es_interno }` |

### 1.4. Modelo de datos
`IncidentListItem`, `IncidentDetail`, `DashboardStats`
([`api.ts:21-85`](../../apps/mobile/src/shared/types/api.ts#L21-L85)).
Estados (`IncidentStatus`): `RECIBIDO, EN_EVALUACION, EN_ATENCION, ESCALADO,
PENDIENTE_INFO, RESUELTO, CERRADO`. Severidades: `BAJO, MEDIO, ALTO, CRITICO`.

### 1.5. Comportamiento
- **Carga inicial inmediata** con mocks, reemplazada por datos reales tras el
  primer sync ([`use-operator-data.ts:24-25`](../../apps/mobile/src/features/operator/use-operator-data.ts#L24-L25)).
- **Polling cada 30 s** y dedupe vía `refreshInFlightRef`
  ([`use-operator-data.ts:33-64,126-130`](../../apps/mobile/src/features/operator/use-operator-data.ts#L33-L64)).
- **Filtrado en cliente** por texto (código/título/zona) y estado
  ([`IncidentsScreen.tsx:24-33`](../../apps/mobile/src/features/operator/IncidentsScreen.tsx#L24-L33)).
- **Acciones en detalle**:
  - `changeStatus` → `PATCH .../estado` (botones En atención / Escalar / Resolver)
    y luego `refresh()` ([`use-operator-data.ts:82-96`](../../apps/mobile/src/features/operator/use-operator-data.ts#L82-L96)).
  - `addNote` → `POST .../comentarios` (interna, `es_interno=true`) y recarga detalle
    ([`use-operator-data.ts:98-124`](../../apps/mobile/src/features/operator/use-operator-data.ts#L98-L124)).
- **`activeIncidents`** = excluye `RESUELTO`/`CERRADO`
  ([`use-operator-data.ts:157-160`](../../apps/mobile/src/features/operator/use-operator-data.ts#L157-L160)),
  insumo de Dashboard/Mapa/Notificaciones.
- **Modo demo**: todas las mutaciones se simulan localmente sin backend.

### 1.6. Brechas / pendientes
- ❌ **Creación de incidentes** desde mobile: el botón "Nuevo caso" del Dashboard
  navega al listado; no hay formulario de alta
  ([`DashboardScreen.tsx:76-78`](../../apps/mobile/src/features/operator/DashboardScreen.tsx#L76-L78)).
- ❌ **"Activar emergencia"** es un botón sin handler
  ([`DashboardScreen.tsx:82-84`](../../apps/mobile/src/features/operator/DashboardScreen.tsx#L82-L84)).
- 🟡 Adjuntar **evidencia multimedia a un incidente** aún no está cableado (ver §3.6).

---

## 2. Lost & Found en la App Móvil ✅

### 2.1. Objetivo
Permitir al operador consultar **custodias activas/por vencer**, ver sus
**registros móviles**, y **registrar recepciones** de objetos encontrados con
custodia y evidencia fotográfica.

### 2.2. Archivos y acceso
- Pantalla única: [`LostFoundScreen.tsx`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx).
- **Acceso condicional**: la pestaña solo aparece si
  `GET /lost-found/acceso/mi` devuelve `{ acceso: true }`
  ([`OperatorApp.tsx:63-87`](../../apps/mobile/src/bootstrap/OperatorApp.tsx#L63-L87)).
  La pantalla se monta tras la primera visita y se conserva viva con `display:none`.

### 2.3. Contratos backend consumidos

| Acción | Método y ruta |
|---|---|
| Verificar acceso | `GET /lost-found/acceso/mi` |
| Categorías | `GET /lost-found/categorias` |
| Custodias | `GET /lost-found/custodias?estado=ACTIVA,PROXIMA_VENCER&page=1&per_page=80` |
| Mis registros móviles | `GET /lost-found/casos/mis?origen=OPERADOR_MOVIL&limit=80` |
| Registrar recepción | `POST /lost-found/mobile/recepciones` |
| Subir fotos del caso | `POST /lost-found/casos/{id}/fotos/upload` (ver §3) |

### 2.4. Modelo de datos
`LostFoundCategory`, `LostFoundCase`, `LostFoundCustody`,
`LostFoundReceptionPayload`, `LostFoundReceptionResult`
([`api.ts:87-188`](../../apps/mobile/src/shared/types/api.ts#L87-L188)).
- **Metadatos dinámicos** por categoría (`metadatos_schema.campos`) con
  `codigo/etiqueta/tipo/requerido/activo`.

### 2.5. Comportamiento
- **Dos sub-pestañas**: Custodias / Mis registros.
- **Caché en memoria** con TTL 60 s (`LOST_FOUND_CACHE_TTL_MS`) y dedupe de
  peticiones concurrentes (`lostFoundRefreshes`)
  ([`LostFoundScreen.tsx:61-95`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L61-L95)).
- **Carga combinada** (custodias + mis registros + categorías) en paralelo.
- **Registro de recepción** (`submit`,
  [`LostFoundScreen.tsx:150-190`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L150-L190)):
  - Tipo fijo `ENCONTRADO`, etiqueta `OPERADOR_MOVIL`, `fecha_evento = now`.
  - Construye `metadatos` solo con campos no vacíos.
  - Tras crear el caso, si hay fotos → upload (§3); muestra modal de confirmación
    con el `codigo`, limpia el formulario, `refresh(force)` y salta a "Mis registros".
- **Validación previa** (`validate`,
  [`LostFoundScreen.tsx:609-622`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L609-L622)):
  longitudes (título 3–200, descripción 10–4000, lugar 3–255, ubicación 2–255,
  observaciones 0–2000, metadato 0–120) y campos requeridos por categoría.
- **Estados de custodia/caso** traducidos a etiquetas legibles (`custodyStatus`,
  `caseStatus`).

### 2.6. Brechas / pendientes
- 🟡 Solo soporta `tipo=ENCONTRADO` (recepción operativa); no captura de "perdido".
- 🟡 El detalle del caso es de **solo lectura**; no hay transición de estado de
  custodia (devolución/descarte) desde mobile.

---

## 3. Uploader Multimedia en la App Móvil 🟡

### 3.1. Objetivo
Capturar/seleccionar imágenes y subirlas como evidencia de un caso.

### 3.2. Archivos
- UI y lógica de captura: [`LostFoundScreen.tsx`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx)
  (`openCamera`, `takePhoto`, `pickImages`, `removePhoto`).
- Servicio de subida: `uploadLostFoundCasePhotos`
  ([`client.ts:102-116`](../../apps/mobile/src/shared/api/client.ts#L102-L116)).
- Soporte multipart en la capa HTTP
  ([`http-client.ts:50-61`](../../apps/mobile/src/shared/api/http-client.ts#L50-L61)).

### 3.3. Fuentes de imagen
- **Cámara** (`expo-camera` `CameraView` + `useCameraPermissions`):
  `takePictureAsync({ quality: 0.75 })`
  ([`LostFoundScreen.tsx:207-213`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L207-L213)).
- **Galería** (`expo-image-picker`): `launchImageLibraryAsync` con
  multi-selección, `mediaTypes:["images"]`, `quality:0.75`, `selectionLimit`
  según cupo restante
  ([`LostFoundScreen.tsx:215-235`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L215-L235)).

### 3.4. Reglas / límites
- **Máximo 3 imágenes** por caso (`MAX_PHOTOS`); guardia de cupo en cámara y
  galería; `Alert` "Límite alcanzado".
- Compresión a `quality 0.75`.
- Previsualización en grid con opción de **quitar** cada imagen y modal de
  vista ampliada (`ImagePreviewModal`).

### 3.5. Contrato de subida
`POST /lost-found/casos/{id}/fotos/upload` con `FormData`
([`client.ts:102-116`](../../apps/mobile/src/shared/api/client.ts#L102-L116)):
- Campo repetido **`archivos`** por cada URI.
- Cada parte: `{ uri, name: "recepcion-<ts>-<n>.jpg", type: "image/jpeg" }`.
- La capa HTTP detecta `FormData` y **omite `Content-Type`** (deja el boundary
  nativo) conservando `Authorization` ([`http-client.ts:56-61`](../../apps/mobile/src/shared/api/http-client.ts#L56-L61)).
- Se invoca **después** de crear el caso, con `result.caso.id`
  ([`LostFoundScreen.tsx:175-177`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L175-L177)).

### 3.6. Brechas / pendientes
- 🟡 **Acoplado a Lost & Found.** No existe un uploader reutilizable
  (componente/hook) independiente del módulo.
- ❌ **Sin subida de evidencia para incidentes** (el comentario en
  [`use-camera-permission.ts:6`](../../apps/mobile/src/features/permissions/use-camera-permission.ts#L6)
  anota "uso pleno en S8" para evidencia de incidentes, pero el cableado no existe).
- 🟡 Subida **sin barra de progreso** ni reintento granular por archivo (depende
  del retry global de la capa HTTP).
- 🟡 Tipo MIME fijo `image/jpeg`; no soporta video ni otros formatos.
- 🟡 Existe un hook propio `useCameraPermission`
  ([`use-camera-permission.ts`](../../apps/mobile/src/features/permissions/use-camera-permission.ts))
  exportado y testeado pero **no usado**; el flujo real usa `useCameraPermissions`
  de expo. (Decidir cuál es canónico para S8.)

---

## 4. Módulo de Seguimiento de Casos 🟡

> "Caso" se materializa en dos superficies: **incidentes** asignados y **casos
> Lost & Found** registrados por el operador. El seguimiento hoy es por **consulta
> periódica (polling)**, no por suscripción en tiempo real.

### 4.1. Seguimiento de incidentes
- **Lista propia** (`mios=true`) refrescada cada 30 s
  ([`use-operator-data.ts:126-130`](../../apps/mobile/src/features/operator/use-operator-data.ts#L126-L130)).
- **Detalle vivo**: al abrir un incidente con `live_location_enabled` y no
  expirado, se re-consulta `GET /incidentes/{id}` **cada 5 s** para refrescar la
  ubicación del reportante
  ([`use-operator-data.ts:132-155`](../../apps/mobile/src/features/operator/use-operator-data.ts#L132-L155)).
- **Indicador "Ubicación en vivo"** y "Última ubicación" en el detalle
  ([`IncidentDetailScreen.tsx:32-35,70-72,90-97`](../../apps/mobile/src/features/operator/IncidentDetailScreen.tsx#L32-L35)).
- **Trazabilidad de estado**: historial + comentarios (ver §6).

### 4.2. Seguimiento de casos Lost & Found
- Sub-pestaña **"Mis registros"**: casos creados desde mobile
  (`origen=OPERADOR_MOVIL`), con estado del caso visible
  ([`LostFoundScreen.tsx:277-288`](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L277-L288)).
- **Custodias** con estado (`ACTIVA/PROXIMA_VENCER`), ubicación y "días en
  custodia" calculados en cliente (`daysBetween`).
- Detalle de caso/custodia de solo lectura con imágenes y metadatos
  (`DetailModal`).

### 4.3. Brechas / pendientes
- ❌ **Sin realtime** (WebSocket/SSE/push): el seguimiento depende de polling
  (30 s incidentes / 5 s ubicación en vivo / 60 s caché L&F).
- ❌ No hay vista unificada "mis casos" que combine incidentes + L&F.
- 🟡 Las transiciones de estado de custodia L&F no se gestionan desde mobile.

---

## 5. Receptor de Notificaciones Push 🟡

> **Hallazgo clave:** lo implementado son **notificaciones LOCALES** disparadas
> por el polling del listado, **no** push remoto. No hay registro de Expo Push
> token ni listeners de notificaciones entrantes.

### 5.1. Archivos
- Hook generador: [`use-incident-notifications.ts`](../../apps/mobile/src/features/operator/use-incident-notifications.ts).
- Permiso: [`use-notification-permission.ts`](../../apps/mobile/src/features/permissions/use-notification-permission.ts).
- Pantalla de gestión/estado: [`NotificationsScreen.tsx`](../../apps/mobile/src/features/operator/NotificationsScreen.tsx).

### 5.2. Comportamiento real
- **Handler global** muestra banner/lista/sonido aun en primer plano
  ([`use-incident-notifications.ts:9-16`](../../apps/mobile/src/features/operator/use-incident-notifications.ts#L9-L16)).
- **Permiso**: se solicita una sola vez si está `undetermined`
  ([`use-incident-notifications.ts:38-41`](../../apps/mobile/src/features/operator/use-incident-notifications.ts#L38-L41)).
- **Detección de nuevos asignados**: compara ids del listado contra un baseline;
  por cada incidente nuevo dispara
  `Notifications.scheduleNotificationAsync({ trigger: null })` (notificación local
  inmediata) con título "Nuevo incidente asignado" y `data.incidentId`
  ([`use-incident-notifications.ts:43-78`](../../apps/mobile/src/features/operator/use-incident-notifications.ts#L43-L78)).
- **Anti-avalancha**: hasta el primer sync real y mientras no haya permiso, solo
  se mantiene el baseline sin notificar.
- **NotificationsScreen** refleja estado del permiso (`granted/blocked/otros`) y
  permite `request()` o `openSettings()`.

### 5.3. Brechas / pendientes (críticas para "Push")
- ❌ **Sin push remoto**: no se llama `getExpoPushTokenAsync` ni se registra el
  token en backend (verificado: sin coincidencias de
  `getExpoPushToken/registerForPushNotifications` en el código).
- ❌ **Sin listeners** `addNotificationReceivedListener` /
  `addNotificationResponseReceivedListener`: tocar la notificación **no navega**
  al incidente (el `data.incidentId` no se consume).
- ❌ No funciona con la **app cerrada** (las locales requieren proceso vivo). La
  push real requiere **development build** + servicio de envío (documentado como
  TODO en [`use-incident-notifications.ts:26-29`](../../apps/mobile/src/features/operator/use-incident-notifications.ts#L26-L29)).
- 🟡 Plugin `expo-notifications` ya declarado en
  [`app.json:40`](../../apps/mobile/app.json#L40); falta `expo-device` y el flujo
  de registro de token.

---

## 6. Historial y Mapa Móvil ✅

### 6.1. Historial (trazabilidad)
- **Incidentes**: el detalle renderiza `historial` (acción, fecha, estado nuevo,
  comentario) y `comentarios` (autor, interno/público, fecha)
  ([`IncidentDetailScreen.tsx:165-192`](../../apps/mobile/src/features/operator/IncidentDetailScreen.tsx#L165-L192)).
  Modelo en [`api.ts:66-85`](../../apps/mobile/src/shared/types/api.ts#L66-L85).
- **Lost & Found**: el historial del caso es **inmutable** a nivel API (no admite
  `PATCH`/`DELETE`), validado por prueba funcional
  ([`prueba_funcional_lost_found_historial_inmutable_api.md`](../evidencias/prueba_funcional_lost_found_historial_inmutable_api.md)).
  En mobile el detalle es de solo lectura, consistente con esa invariante.

### 6.2. Mapa móvil
- **Pantalla**: [`MapScreen.tsx`](../../apps/mobile/src/features/operator/MapScreen.tsx)
  con `react-native-maps` (`MapView`, `Marker`).
- **Ubicación del operador**: hook
  [`use-operator-location.ts`](../../apps/mobile/src/features/operator/use-operator-location.ts):
  - `watchPositionAsync` (`Accuracy.Balanced`, `distanceInterval 10 m`,
    `timeInterval 5 s`), con limpieza de suscripción al desmontar para no drenar
    batería ([`use-operator-location.ts:48-72`](../../apps/mobile/src/features/operator/use-operator-location.ts#L48-L72)).
- **Marcadores de incidentes** geocodificados (lat/long no nulos), color por
  severidad, `onCalloutPress → openIncident`
  ([`MapScreen.tsx:78-88`](../../apps/mobile/src/features/operator/MapScreen.tsx#L78-L88)).
- **Bifurcación por permiso**: `granted` → mapa + "Mi ubicación"; `blocked` →
  "Abrir ajustes"; resto → "Permitir ubicación".
- **Región fallback** PUCP/Lima cuando aún no hay GPS
  ([`MapScreen.tsx:13-19`](../../apps/mobile/src/features/operator/MapScreen.tsx#L13-L19)).
- **Mini-mapa en detalle**: ubicación del reportante (estático, no interactivo)
  ([`IncidentDetailScreen.tsx:101-132`](../../apps/mobile/src/features/operator/IncidentDetailScreen.tsx#L101-L132)).

### 6.3. Brechas / pendientes
- 🟡 El mapa muestra incidentes propios activos; no hay capas/filtros de zonas ni
  clustering.
- 🟡 No hay vista de mapa para casos Lost & Found.

---

## 7. Permisos nativos (transversal a §3, §5, §6)

- **Manifiesto** [`app.json`](../../apps/mobile/app.json): Android `CAMERA`,
  `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`; iOS `NSCameraUsageDescription`,
  `NSLocationWhenInUseUsageDescription`; plugins `expo-camera`, `expo-location`,
  `expo-notifications`, `expo-secure-store`.
- **Modelo normalizado** de 4 estados (`undetermined/granted/denied/blocked`)
  en [`permission-types.ts`](../../apps/mobile/src/features/permissions/permission-types.ts).
- **Patrón contextual** `ensurePermission` (pedir al usar; nunca bloquear la app;
  derivar a `FB-PERM`) en
  [`ensure-permission.ts`](../../apps/mobile/src/features/permissions/ensure-permission.ts).
- **Hooks por capacidad**: cámara, ubicación, notificaciones
  ([`permissions/`](../../apps/mobile/src/features/permissions/)).

---

## 8. Resiliencia y red (transversal)

- **Retry + backoff + timeout** ([`retry.ts`](../../apps/mobile/src/shared/fallback/retry.ts)):
  `HTTP_MAX_RETRIES=3`, backoff exponencial (tope 8 s), `HTTP_TIMEOUT_MS=15 s`.
  Reintenta solo 5xx, timeout o error de red.
- **Circuit breaker** ([`circuit-breaker.ts`](../../apps/mobile/src/shared/fallback/circuit-breaker.ts)):
  abre tras 5 fallos, cooldown 30 s, prueba en `HALF_OPEN`.
- **Sesión**: `401 → EXPIRED`; idle timeout; token solo en SecureStore.
- **Banner offline** vía NetInfo (`useNetworkStatus`).
- **Degradación de datos**: `useOperatorData` conserva últimos datos ante error.
- **Códigos de fallback** (`FB-NET/5XX/AUTH/401/PERM/DATA`)
  ([`logger.ts`](../../apps/mobile/src/shared/fallback/logger.ts)).

---

## 9. Tabla consolidada de endpoints consumidos

| Función ([`client.ts`](../../apps/mobile/src/shared/api/client.ts)) | Método y ruta | Módulo S8 |
|---|---|---|
| `loginOperator` | `POST /auth/mobile/operator/login` | (auth) |
| `getMe` | `GET /auth/me` | (auth) |
| `listIncidents` | `GET /incidentes/?mios=true&limit=80` | 1, 4 |
| `getIncident` | `GET /incidentes/{id}` | 1, 4, 6 |
| `getDashboardStats` | `GET /incidentes/stats?mios=true` | 1 |
| `updateIncidentStatus` | `PATCH /incidentes/{id}/estado` | 1, 6 |
| `addIncidentComment` | `POST /incidentes/{id}/comentarios` | 1, 6 |
| `getLostFoundAccess` | `GET /lost-found/acceso/mi` | 2 |
| `listLostFoundCategories` | `GET /lost-found/categorias` | 2 |
| `listLostFoundCustodies` | `GET /lost-found/custodias?...` | 2, 4 |
| `listMyLostFoundMobileRecords` | `GET /lost-found/casos/mis?origen=OPERADOR_MOVIL...` | 2, 4 |
| `registerLostFoundMobileReception` | `POST /lost-found/mobile/recepciones` | 2 |
| `uploadLostFoundCasePhotos` | `POST /lost-found/casos/{id}/fotos/upload` | 3 |

Todas adjuntan `Authorization: Bearer <token>` salvo el login.

---

## 10. Síntesis de brechas para el documento oficial S8

| Módulo | Estado real | Brecha principal a declarar |
|---|---|---|
| Gestión de Incidentes | ✅ operación completa | Sin alta de incidentes ni "emergencia" funcional |
| Lost & Found | ✅ recepción + consulta | Solo `ENCONTRADO`; detalle solo lectura |
| Uploader Multimedia | 🟡 funcional en L&F | No reutilizable; sin evidencia para incidentes; sin progreso |
| Seguimiento de Casos | 🟡 vía polling | Sin realtime; sin vista unificada |
| Notificaciones Push | 🟡 **locales, no remotas** | Falta Expo Push token, listeners y deep-link a incidente |
| Historial y Mapa | ✅ historial + mapa | Sin capas/zonas ni mapa para L&F |
