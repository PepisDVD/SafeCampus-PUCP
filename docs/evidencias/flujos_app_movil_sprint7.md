# Flujos de la App Móvil (Operador) — Sprint 7

> Documento fuente para construir los **diagramas de secuencia / flujo**.
> Toda la información se deriva directamente del código actual en
> [apps/mobile/](../../apps/mobile/). Cada paso referencia el archivo y la
> función exacta para mantener la trazabilidad con la implementación.

## 1. Contexto técnico

- **Framework:** React Native + Expo (`expo ~54`), entrada en
  [App.tsx](../../apps/mobile/App.tsx) → [src/bootstrap/OperatorApp.tsx](../../apps/mobile/src/bootstrap/OperatorApp.tsx).
- **App de un solo rol:** consola para **operadores de seguridad** en campo.
- **Navegación:** no usa react-navigation; es un *shell* con pestañas controladas
  por estado (`tab`) en [OperatorApp.tsx](../../apps/mobile/src/bootstrap/OperatorApp.tsx).
- **Backend:** FastAPI. El cliente HTTP vive en
  [src/shared/api/](../../apps/mobile/src/shared/api/). `API_BASE_URL` se resuelve en
  [src/shared/config/env.ts](../../apps/mobile/src/shared/config/env.ts).
- **Sesión:** token Bearer guardado en *secure-store*
  ([token-store.ts](../../apps/mobile/src/features/auth/token-store.ts)); el backend
  es la fuente de verdad (`GET /auth/me`).

### Actores recurrentes (para los diagramas)

| Actor / participante | Qué representa |
| --- | --- |
| **Operador** | Usuario humano que interactúa con la UI. |
| **UI / Pantalla** | Componente React Native (Login, Dashboard, LostFound, etc.). |
| **AuthProvider** | Contexto de sesión ([auth-context.tsx](../../apps/mobile/src/features/auth/auth-context.tsx)). |
| **tokenStore** | SecureStore (almacenamiento cifrado del token). |
| **apiFetch** | Capa HTTP con retry + circuit breaker ([http-client.ts](../../apps/mobile/src/shared/api/http-client.ts)). |
| **Backend** | API FastAPI (`/api/v1/...`). |
| **SO / Permisos nativos** | Diálogos del sistema operativo (cámara, ubicación, notificaciones). |
| **Hook de permiso** | `usePermission` / `useCameraPermissions` de expo. |

---

## 2. Estados de sesión (máquina de estados)

Definidos en [session.ts](../../apps/mobile/src/shared/types/session.ts):

```
UNKNOWN → UNAUTHENTICATED → AUTHENTICATING → AUTHENTICATED → EXPIRED
```

| Estado | Significado | Pantalla mostrada |
| --- | --- | --- |
| `UNKNOWN` | Arranque, aún rehidratando sesión | Splash (`ActivityIndicator`) |
| `UNAUTHENTICATED` | Sin sesión válida | `LoginScreen` |
| `AUTHENTICATING` | Login en curso | `LoginScreen` (botón en `loading`) |
| `AUTHENTICATED` | Sesión activa | `AuthenticatedShell` (pestañas) |
| `EXPIRED` | Sesión caída por inactividad o 401 | `LoginScreen` con aviso de expiración |

Decisión de render en [OperatorApp.tsx:33-47](../../apps/mobile/src/bootstrap/OperatorApp.tsx#L33-L47):
`UNKNOWN` → splash; `!= AUTHENTICATED` → Login; en otro caso → shell.

---

## 3. Flujo: Arranque y rehidratación de sesión (cold start)

**Disparador:** se abre la app.
**Archivos:** [auth-context.tsx:64-80](../../apps/mobile/src/features/auth/auth-context.tsx#L64-L80),
[OperatorApp.tsx:33-47](../../apps/mobile/src/bootstrap/OperatorApp.tsx#L33-L47).

Secuencia:

1. `App` monta `AuthProvider` → estado inicial `status = UNKNOWN`.
2. `OperatorApp` ve `UNKNOWN` → muestra **Splash**.
3. `AuthProvider` (efecto de arranque) llama `tokenStore.get()` (SecureStore).
4. **Alt A — no hay token:** `setStatus(UNAUTHENTICATED)` → se muestra `LoginScreen`.
5. **Alt B — hay token:**
   1. Llama `getMe(token)` → `apiFetch GET /auth/me`.
   2. **Éxito:** `setUser`, `setToken`, `setStatus(AUTHENTICATED)` → `AuthenticatedShell`.
   3. **Fallo (token inválido):** `tokenStore.clear()` + `setStatus(UNAUTHENTICATED)` → `LoginScreen`.

Puntos para el diagrama: bifurcación (token presente/ausente) y el caso de
token vencido que limpia el almacenamiento.

---

## 4. Flujo: Login del operador

**Pantalla:** [LoginScreen.tsx](../../apps/mobile/src/features/auth/LoginScreen.tsx).
**Lógica:** `loginWithOperatorEmail` en [auth-context.tsx:92-110](../../apps/mobile/src/features/auth/auth-context.tsx#L92-L110).

Hay **tres caminos de acceso**:

### 4.1 Login con email/contraseña operativo

1. Operador escribe email + contraseña y pulsa **"Ingresar con email operativo"**.
2. `AuthProvider.loginWithOperatorEmail(email, password)`:
   - `setStatus(AUTHENTICATING)`, `setLoading(true)`, limpia error.
   - `loginOperator()` → `apiFetch POST /auth/mobile/operator/login` con `{ email, password }`.
3. **Éxito:** recibe `AuthSession { access_token, user }`:
   - `tokenStore.set(access_token)` (SecureStore).
   - `setToken`, `setUser`, `setIsDemo(false)`, `setStatus(AUTHENTICATED)`.
4. **Fallo:** `logger.fallback("FB-AUTH")`, `setError(mensaje)`, `setStatus(UNAUTHENTICATED)`.
   La UI muestra el error bajo el formulario.

### 4.2 Login institucional PUCP (Google / OAuth externo)

[LoginScreen.tsx:13-16](../../apps/mobile/src/features/auth/LoginScreen.tsx#L13-L16):

1. Operador pulsa **"Login institucional PUCP"**.
2. `Linking.openURL(<authBase>/api/v1/auth/google/login?email=...&next=/dashboard)`
   → abre el navegador del sistema (flujo OAuth fuera de la app).

> Nota: el retorno del OAuth al token de la app no está cableado en este código
> mobile (no hay deep-link handler); el camino actual abre el navegador externo.

### 4.3 Modo demo (solo dev)

[LoginScreen.tsx:60-64](../../apps/mobile/src/features/auth/LoginScreen.tsx#L60-L64),
`continueAsDemoOperator` en [auth-context.tsx:112-118](../../apps/mobile/src/features/auth/auth-context.tsx#L112-L118):

1. Visible solo si `CONFIG.ALLOW_DEMO_MODE` (`EXPO_PUBLIC_ALLOW_DEMO != "false"`).
2. Fija `token = "demo-token"`, `user = mockOperatorUser`, `isDemo = true`,
   `status = AUTHENTICATED`. No llama al backend; los datos vienen de mocks.

---

## 5. Flujo: Expiración / cierre de sesión

Tres formas de salir de `AUTHENTICATED`:

### 5.1 Inactividad (idle timeout)

[use-idle-timeout.ts](../../apps/mobile/src/features/auth/use-idle-timeout.ts) +
[auth-context.tsx:48-61](../../apps/mobile/src/features/auth/auth-context.tsx#L48-L61):

1. Al autenticar (y **no** en demo) se arma un temporizador de
   `CONFIG.SESSION_IDLE_TIMEOUT_MS` (default 1 800 000 ms ≈ 30 min; el comentario
   dice 15 min).
2. Cada interacción dispara `notifyActivity` (vía `onTouchStart` del shell,
   [OperatorApp.tsx:111](../../apps/mobile/src/bootstrap/OperatorApp.tsx#L111)) y
   también cada respuesta HTTP exitosa (`onActivity` en
   [http-client.ts:89](../../apps/mobile/src/shared/api/http-client.ts#L89)) → `reset()`.
3. Si vence sin actividad → `markExpired()`: limpia token y `setStatus(EXPIRED)`.

### 5.2 Respuesta 401 desde cualquier llamada

[http-client.ts:82-86](../../apps/mobile/src/shared/api/http-client.ts#L82-L86):
un `401` ejecuta `onUnauthorized?.()` → `markExpired()` → `EXPIRED`
(registra `FB-401`). La sesión cae aunque el usuario esté activo.

### 5.3 Logout manual ("Finalizar turno")

[ProfileScreen.tsx:57-60](../../apps/mobile/src/features/operator/ProfileScreen.tsx#L57-L60)
→ `logout()` en [auth-context.tsx:120-127](../../apps/mobile/src/features/auth/auth-context.tsx#L120-L127):
`tokenStore.clear()` y `setStatus(UNAUTHENTICATED)`.

> En `EXPIRED` la `LoginScreen` muestra: *"Tu sesión expiró por inactividad."*

---

## 6. Flujo: Shell autenticado y navegación por pestañas

**Archivo:** `AuthenticatedShell` en [OperatorApp.tsx:49-161](../../apps/mobile/src/bootstrap/OperatorApp.tsx#L49-L161).

Pestañas base (`TAB_ITEMS`): **Inicio, Incidentes, Mapa, Lost & Found, Perfil**.
"Alertas" (notificaciones) es una pestaña accesible desde Perfil, no de la barra.

Comportamientos clave:

1. **Carga de datos del operador:** monta `useOperatorData(token)` (sección 7).
2. **Notificaciones de asignación:** `useIncidentAssignmentNotifications` (sección 11).
3. **Acceso condicional a Lost & Found:**
   [OperatorApp.tsx:63-87](../../apps/mobile/src/bootstrap/OperatorApp.tsx#L63-L87):
   - Si hay token real (no demo) → `getLostFoundAccess(token)`
     (`GET /lost-found/acceso/mi`). Si `acceso=true` aparece la pestaña.
   - Si el acceso es false y la pestaña activa era `lost-found`, se redirige a `inicio`.
   - La pantalla LF solo se monta tras haberla visitado (`lostFoundVisited`) y se
     mantiene viva en segundo plano con `display:none` para conservar estado.
4. **Banner offline:** si `useNetworkStatus().isOnline === false` se muestra la
   barra "Sin conexión · trabajando con los últimos datos disponibles".
5. **Swipe entre pestañas:** `PanResponder`
   ([OperatorApp.tsx:89-106](../../apps/mobile/src/bootstrap/OperatorApp.tsx#L89-L106))
   permite cambiar de pestaña deslizando horizontalmente.

---

## 7. Flujo: Carga y sincronización de datos del operador

**Hook:** [use-operator-data.ts](../../apps/mobile/src/features/operator/use-operator-data.ts).

Estado inicial = **mocks** (`mockIncidents`, `mockStats`) para render inmediato.

### 7.1 Refresh (polling cada 30 s)

[use-operator-data.ts:33-64, 126-130](../../apps/mobile/src/features/operator/use-operator-data.ts#L33-L64):

1. Al montar y luego cada 30 s → `refresh()`.
2. **Modo demo:** vuelve a mocks y fija `lastSyncAt`.
3. **Modo real:** en paralelo
   - `listIncidents(token)` → `GET /incidentes/?mios=true&limit=80`
   - `getDashboardStats(token)` → `GET /incidentes/stats?mios=true`
   - Éxito: actualiza `incidents`, `stats`, `lastSyncAt`.
   - Error: **degradación** — conserva los últimos datos (loguea `operator-data/refresh`).
4. `refreshInFlightRef` evita refrescos solapados (dedupe).

### 7.2 Abrir detalle de incidente

`openIncident(incident)`:
- Demo → `buildMockDetail`.
- Real → `getIncident(token, id)` → `GET /incidentes/{id}` → `setSelected`.

### 7.3 Live location del reportante (polling 5 s)

[use-operator-data.ts:132-155](../../apps/mobile/src/features/operator/use-operator-data.ts#L132-L155):
si el incidente seleccionado tiene `live_location_enabled` y no expiró, se
re-consulta `getIncident` cada 5 s para refrescar su posición.

---

## 8. Flujo: Gestión de un incidente (detalle)

**Pantallas:** [IncidentsScreen.tsx](../../apps/mobile/src/features/operator/IncidentsScreen.tsx)
→ [IncidentDetailScreen.tsx](../../apps/mobile/src/features/operator/IncidentDetailScreen.tsx).

1. `IncidentsScreen` filtra por texto y por estado (`statusFilters`). Si
   `data.selected` existe, renderiza el detalle.
2. En el detalle, el operador puede:
   - **Cambiar estado** (En atención / Escalar / Resolver) → `changeStatus()`
     → `PATCH /incidentes/{id}/estado` con `{ estado, comentario }`; luego `refresh()`.
   - **Agregar nota operativa** (interna) → `addNote()` →
     `POST /incidentes/{id}/comentarios` con `{ contenido, es_interno:true }`,
     y recarga el detalle.
3. Muestra mapa de la ubicación del reportante (si hay coordenadas),
   historial y comentarios.

Para los diagramas: cada acción del detalle es un round-trip
`UI → apiFetch → Backend → setSelected/refresh`.

---

## 9. Flujo: Mapa táctico

**Pantalla:** [MapScreen.tsx](../../apps/mobile/src/features/operator/MapScreen.tsx)
+ hook [use-operator-location.ts](../../apps/mobile/src/features/operator/use-operator-location.ts).

1. Usa `useOperatorLocation()` para el permiso y posición GPS.
2. **Bifurcación por permiso** ([MapScreen.tsx:68-113](../../apps/mobile/src/features/operator/MapScreen.tsx#L68-L113)):
   - `granted` → renderiza `MapView` con `showsUserLocation` y marcadores de
     incidentes geocodificados; botón "Mi ubicación" centra en GPS.
   - `blocked` → tarjeta con "Abrir ajustes" → `location.openSettings()`.
   - otro (denied/undetermined) → tarjeta "Permitir ubicación" → `location.request()`.
3. Sin GPS aún → usa `FALLBACK_REGION` (PUCP, Lima).

El detalle del flujo de permiso de ubicación se desarrolla en la **sección 13**.

---

## 10. Flujo: Lost & Found (recepción con evidencia)

**Pantalla:** [LostFoundScreen.tsx](../../apps/mobile/src/features/operator/LostFoundScreen.tsx).
Solo accesible si `getLostFoundAccess` devolvió `acceso=true` (sección 6.3).

### 10.1 Carga de datos (con caché)

[LostFoundScreen.tsx:64-145](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L64-L145):

1. Al activarse la pestaña → `refresh()`.
2. Caché en memoria con TTL de 60 s (`LOST_FOUND_CACHE_TTL_MS`). Si hay snapshot
   fresco, se usa sin pegarle al backend; `lostFoundRefreshes` deduplica peticiones.
3. Si no hay caché fresco, en paralelo:
   - `listLostFoundCustodies` → `GET /lost-found/custodias?estado=ACTIVA,PROXIMA_VENCER...`
   - `listMyLostFoundMobileRecords` → `GET /lost-found/casos/mis?origen=OPERADOR_MOVIL...`
   - `listLostFoundCategories` → `GET /lost-found/categorias`
4. Error → `Alert` "No se pudo cargar la información del módulo".

Dos pestañas internas: **Custodias** y **Mis registros**.

### 10.2 Registrar recepción (objeto encontrado)

`submit()` en [LostFoundScreen.tsx:150-190](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L150-L190):

1. Operador abre el formulario (FAB `+`) y completa título, descripción,
   categoría, metadatos dinámicos (según `metadatos_schema` de la categoría),
   lugar y ubicación de custodia. Puede adjuntar hasta **3 fotos** (sección 12).
2. `validate(form, metadatos)` revisa longitudes mínimas/máximas y campos
   requeridos. Si falla → `Alert` "Revisa el registro".
3. `registerLostFoundMobileReception(token, body)` →
   `POST /lost-found/mobile/recepciones` (tipo `ENCONTRADO`, etiqueta `OPERADOR_MOVIL`).
4. Si hay fotos → `uploadLostFoundCasePhotos(token, casoId, uris)` →
   `POST /lost-found/casos/{id}/fotos/upload` (multipart `FormData`).
5. Éxito → modal de confirmación con el `codigo` del caso, limpia formulario,
   `refresh(force)` y cambia a la pestaña "Mis registros".
6. Error → `Alert` "No se pudo registrar".

---

## 11. Flujo: Notificaciones de asignación

**Hook:** [use-incident-notifications.ts](../../apps/mobile/src/features/operator/use-incident-notifications.ts).
**Pantalla de gestión:** [NotificationsScreen.tsx](../../apps/mobile/src/features/operator/NotificationsScreen.tsx).

1. Al montar el shell, pide el permiso de notificaciones **una vez** si está
   `undetermined` ([use-incident-notifications.ts:38-41](../../apps/mobile/src/features/operator/use-incident-notifications.ts#L38-L41)).
2. En cada actualización del listado de incidentes (polling):
   - Antes del primer sync real → solo fija baseline (no notifica) para evitar
     una avalancha al abrir la app.
   - Sin permiso → mantiene el set al día sin notificar.
   - Con permiso `granted` → detecta incidentes **nuevos** (ids no vistos) y
     dispara `Notifications.scheduleNotificationAsync` (notificación **local**).
3. La pantalla "Alertas" muestra el estado del permiso y permite activarlo
   (`request`) o abrir ajustes si está `blocked`.

> Limitación documentada en el código: son notificaciones **locales** (app viva
> en primer/segundo plano). La push remota (app cerrada) requiere un development
> build con Expo Push token (TODO).

---

## 12. DIAGRAMA DE PERMISOS — Arquitectura general

> Esta sección es la base para los **diagramas de flujo de permisos**.

### 12.1 Permisos declarados (manifiesto)

[app.json](../../apps/mobile/app.json):

| Plataforma | Permisos declarados |
| --- | --- |
| **Android** | `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` |
| **iOS (infoPlist)** | `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription` |
| **Plugins Expo** | `expo-camera`, `expo-location`, `expo-notifications`, `expo-secure-store` |

Mensaje de uso de cámara declarado:
*"Se usa la cámara para adjuntar evidencia fotográfica a un incidente."*

### 12.2 Modelo de estados de permiso (4 estados normalizados)

[permission-types.ts](../../apps/mobile/src/features/permissions/permission-types.ts):

```
undetermined  → aún no se preguntó
granted       → concedido
denied        → denegado pero se puede volver a pedir (canAskAgain = true)
blocked       → denegado permanentemente (canAskAgain = false) → solo Ajustes
```

`normalizePermission({ status, canAskAgain })`:
- `status === "granted"` → `granted`
- `status === "undetermined"` → `undetermined`
- denegado y `canAskAgain` → `denied`; si no → `blocked`

### 12.3 Dos implementaciones de permiso de cámara (importante para el diagrama)

El código tiene **dos caminos** y conviene reflejarlo:

1. **Hook genérico propio** `useCameraPermission`
   ([use-camera-permission.ts](../../apps/mobile/src/features/permissions/use-camera-permission.ts))
   sobre `usePermission` + `Camera.get/requestCameraPermissionsAsync`.
   *Está exportado y testeado, pero hoy NO se consume en ninguna pantalla*
   (preparado para uso pleno de evidencia de incidentes en S8).
2. **Hook nativo de expo** `useCameraPermissions` de `expo-camera`, usado
   **realmente** en [LostFoundScreen.tsx:111](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L111)
   para la captura de fotos de Lost & Found.

> Para el diagrama de "permisos (cámara)" la **fuente de verdad operativa** es la
> de la sección 13.2 (LostFoundScreen con `useCameraPermissions`).

### 12.4 Patrón contextual `ensurePermission` (FB-PERM)

[ensure-permission.ts](../../apps/mobile/src/features/permissions/ensure-permission.ts) —
patrón de referencia "pedir el permiso al usarlo, nunca bloquear la app":

```
ensurePermission(permission):
  state = permission.state
  if state in {undetermined, denied}:
      state = await permission.request()
  if state == granted:        return "granted"   // continuar
  if state == blocked:        return "blocked"    // guiar a Ajustes
  else:                       return "unavailable"// ofrecer alternativa
  (registra FB-PERM en blocked/unavailable)
```

Resultados (`PermissionOutcome`): `granted | blocked | unavailable`.

---

## 13. DIAGRAMA DE PERMISOS — Flujos por capacidad

### 13.1 Permiso de CÁMARA — vista genérica (`ensurePermission`)

Participantes: **Operador → UI → Hook de permiso → SO (diálogo nativo)**.

1. Operador intenta usar una capacidad protegida.
2. UI llama `ensurePermission({ state, request })`.
3. Si `state` es `undetermined` o `denied` → `request()` → **el SO muestra el diálogo**.
4. El SO devuelve estado; `normalizePermission` lo mapea.
5. Bifurcación:
   - `granted` → continúa con la función.
   - `blocked` → la UI guía a **Ajustes del sistema** (`openSettings`).
   - `unavailable` (denied que sigue denegado) → ofrecer **alternativa** sin la cámara.
6. En `blocked`/`unavailable` se registra `FB-PERM`.

### 13.2 Permiso de CÁMARA — flujo REAL en Lost & Found ★

> Este es el flujo concreto que hoy ejecuta la app. **Recomendado como diagrama
> principal de "permisos (cámara)".**

**Archivo:** `openCamera` / `takePhoto` en
[LostFoundScreen.tsx:192-213](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L192-L213).
Estado del permiso vía `useCameraPermissions()` de expo
([LostFoundScreen.tsx:111](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L111)).

Secuencia `openCamera()`:

1. Operador pulsa el botón **"Cámara"** en el formulario de recepción.
2. **Guardia de límite:** si `photoUris.length >= 3` (MAX_PHOTOS) →
   `Alert` "Límite alcanzado" y termina. (No pide permiso.)
3. **Chequeo de permiso:** si `!cameraPermission?.granted`:
   1. `requestCameraPermission()` → **el SO muestra el diálogo de cámara**.
   2. Si el resultado **no** es `granted` →
      `Alert` "Cámara no disponible — habilita el permiso..." y termina.
4. Si el permiso está/queda concedido → `setCameraOpen(true)` → se abre el
   `Modal` con `CameraView` (`facing="back"`).

Secuencia `takePhoto()`
([LostFoundScreen.tsx:207-213](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L207-L213)):

1. Operador pulsa **"Capturar"**.
2. `cameraRef.current.takePictureAsync({ quality: 0.75 })`.
3. Si hay `uri` → se agrega a `photoUris` (recortado a máx. 3) y se cierra el modal.
4. Operador puede **Cancelar** el modal sin capturar (`setCameraOpen(false)`).

**Estados/bifurcaciones para el diagrama de cámara:**

```
[Pulsa "Cámara"]
   │
   ├─ photoUris >= 3 ───────────────► Alert "Límite alcanzado"  (FIN)
   │
   ├─ permiso ya granted ───────────► abre CameraView
   │
   └─ permiso no granted
          └─ request() → diálogo SO
                 ├─ granted ────────► abre CameraView ──► Capturar ──► foto añadida
                 └─ no granted ─────► Alert "Cámara no disponible" (FIN)
```

> Nota: en este flujo real **no** se distingue explícitamente `denied` de
> `blocked` ni se ofrece "abrir Ajustes": cualquier resultado distinto de
> `granted` cae en el `Alert` de "Cámara no disponible". (El manejo fino de
> `blocked`/Ajustes sí existe para ubicación y notificaciones, y en el patrón
> genérico `ensurePermission`.)

### 13.3 Permiso de GALERÍA (alternativa a la cámara)

`pickImages` en [LostFoundScreen.tsx:215-235](../../apps/mobile/src/features/operator/LostFoundScreen.tsx#L215-L235):

1. Guardia de límite (máx. 3 fotos).
2. `ImagePicker.requestMediaLibraryPermissionsAsync()` → diálogo del SO.
3. Si **no** granted → `Alert` "Galería no disponible".
4. Si granted → `launchImageLibraryAsync` (multi-selección, hasta las restantes,
   `quality 0.75`); agrega las URIs seleccionadas a `photoUris`.

Sirve como **ruta alternativa** cuando la cámara no está disponible — útil para
el ramal "unavailable" del diagrama de permisos.

### 13.4 Permiso de UBICACIÓN

**Hook:** [use-operator-location.ts](../../apps/mobile/src/features/operator/use-operator-location.ts)
sobre `useLocationPermission` (`expo-location`, foreground).
**UI:** [MapScreen.tsx](../../apps/mobile/src/features/operator/MapScreen.tsx).

1. Al entrar al Mapa, `usePermission` consulta el estado inicial
   (`getForegroundPermissionsAsync`) → `isReady`.
2. Bifurcación por estado (MapScreen, sección 9):
   - `granted` → `watchPositionAsync` (suscripción continua, `Accuracy.Balanced`,
     cada 5 s / 10 m) actualiza `coords`. Se limpia al desmontar (no drena batería).
   - `blocked` → botón "Abrir ajustes" → `openSettings()` (Linking).
   - `denied`/`undetermined` → botón "Permitir ubicación" → `request()` → diálogo SO.
3. Tras conceder, `requestAndLoad` continúa; si se niega, deja de cargar.

```
[Abrir Mapa]
   ├─ granted ──────► watchPosition → marcadores + "Mi ubicación"
   ├─ blocked ──────► "Abrir ajustes" → openSettings()
   └─ denied/undet ─► "Permitir ubicación" → request() → diálogo SO
                          ├─ granted ─► watchPosition
                          └─ no ──────► permanece tarjeta sin mapa
```

### 13.5 Permiso de NOTIFICACIONES

**Hook:** [use-notification-permission.ts](../../apps/mobile/src/features/permissions/use-notification-permission.ts)
(`expo-notifications`). **Uso:** sección 11.

1. Al montar el shell, si el estado es `undetermined` → `request()` automático
   (una sola vez) → diálogo del SO.
2. Pantalla "Alertas" ([NotificationsScreen.tsx:49-60](../../apps/mobile/src/features/operator/NotificationsScreen.tsx#L49-L60)):
   - `granted` → "Activas".
   - `blocked` → botón "Abrir ajustes" → `openSettings()`.
   - otro → botón "Activar notificaciones" → `request()`.

---

## 14. Flujos transversales de resiliencia (fallbacks)

La capa HTTP ([http-client.ts](../../apps/mobile/src/shared/api/http-client.ts))
envuelve cada llamada con **retry + timeout + circuit breaker**:

| Código | Disparador | Comportamiento |
| --- | --- | --- |
| `FB-NET` | Error de red / `TypeError` | `ApiError(status 0)` "Sin conexión". |
| `FB-5XX` | 5xx o circuito abierto | retry con backoff; si persiste, `ApiError(503/5xx)`. |
| `FB-401` | 401 | fuerza `EXPIRED` (cierra sesión). |
| `FB-AUTH` | Login fallido | mensaje de error en LoginScreen. |
| `FB-PERM` | Permiso `blocked`/`unavailable` | guía a Ajustes u ofrece alternativa. |
| `FB-DATA` | (reservado) degradación de datos | conservar últimos datos/mocks. |

Mecanismos:
- **Retry** ([retry.ts](../../apps/mobile/src/shared/fallback/retry.ts)): hasta
  `HTTP_MAX_RETRIES` (3) con backoff exponencial (tope 8 s) y timeout por intento
  (`HTTP_TIMEOUT_MS` = 15 s). Solo reintenta 5xx, timeout o error de red.
- **Circuit breaker** ([circuit-breaker.ts](../../apps/mobile/src/shared/fallback/circuit-breaker.ts)):
  `CLOSED → OPEN` tras 5 fallos; `cooldown` 30 s; luego `HALF_OPEN` prueba.
- **Banner offline** vía `useNetworkStatus` (NetInfo).
- **Degradación de datos**: `useOperatorData` conserva los últimos datos ante error.

---

## 15. Catálogo de endpoints consumidos (mobile → backend)

Desde [client.ts](../../apps/mobile/src/shared/api/client.ts):

| Función | Método y ruta | Usado en |
| --- | --- | --- |
| `loginOperator` | `POST /auth/mobile/operator/login` | Login email |
| `exchangeSupabaseSession` | `POST /auth/mobile/supabase-session` | (disponible) |
| `getMe` | `GET /auth/me` | Rehidratación |
| `listIncidents` | `GET /incidentes/?mios=true&limit=80` | Dashboard/Incidentes |
| `getIncident` | `GET /incidentes/{id}` | Detalle / live location |
| `getDashboardStats` | `GET /incidentes/stats?mios=true` | Dashboard |
| `updateIncidentStatus` | `PATCH /incidentes/{id}/estado` | Detalle |
| `addIncidentComment` | `POST /incidentes/{id}/comentarios` | Detalle (notas) |
| `getLostFoundAccess` | `GET /lost-found/acceso/mi` | Habilitar pestaña LF |
| `listLostFoundCategories` | `GET /lost-found/categorias` | Form LF |
| `listLostFoundCustodies` | `GET /lost-found/custodias?...` | LF Custodias |
| `listMyLostFoundMobileRecords` | `GET /lost-found/casos/mis?origen=OPERADOR_MOVIL...` | LF Mis registros |
| `registerLostFoundMobileReception` | `POST /lost-found/mobile/recepciones` | Registrar recepción |
| `uploadLostFoundCasePhotos` | `POST /lost-found/casos/{id}/fotos/upload` | Subir evidencia |

Todas adjuntan `Authorization: Bearer <token>` salvo el login.

---

## 16. Resumen de diagramas sugeridos

**Para "Flujos de la App Móvil Sprint 7":**

1. Máquina de estados de sesión (sección 2).
2. Secuencia: arranque + rehidratación (sección 3).
3. Secuencia: login operador (3 caminos, sección 4).
4. Secuencia: expiración/logout (sección 5).
5. Actividad: navegación del shell + acceso condicional LF (sección 6).
6. Secuencia: polling de datos + degradación (sección 7).
7. Secuencia: gestión de incidente (cambio de estado / nota) (sección 8).
8. Secuencia: recepción Lost & Found con evidencia (sección 10).
9. Secuencia: notificaciones de asignación (sección 11).

**Para "Flujos de permisos (cámara)":**

1. Diagrama de estados de permiso (4 estados, sección 12.2).
2. **Flujo real cámara en Lost & Found** (sección 13.2) ← principal.
3. Patrón genérico `ensurePermission` / FB-PERM (sección 12.4 / 13.1).
4. (Complementarios) ubicación (13.4), notificaciones (13.5), galería (13.3).
```
