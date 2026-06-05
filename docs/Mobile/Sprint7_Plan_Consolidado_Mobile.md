# SafeCampus PUCP — Sprint 7 · Plan Técnico Consolidado (App Móvil)

> **Documento consolidado.** Fusiona la especificación accionable original
> (`Sprint7_Especificacion_Tecnica_Agentes.docx`) con el estado real del código
> en [`apps/mobile`](../../apps/mobile). La especificación define los invariantes
> **[REGLA]**; este documento los **adapta a la arquitectura por *features*** ya
> existente en el monorepo e incorpora lo que falta para cumplirlos.
>
> **Fuentes de verdad (en este orden):**
> 1. Invariantes funcionales/de seguridad **[REGLA]** del spec original.
> 2. **Código actual** del monorepo (estructura, convenciones, contratos backend reales).
>
> **Identidad del cliente:** Frontend Operador (rol de seguridad), interfaz móvil
> de campo. UI de alto contraste, tema oscuro, navegación inferior persistente.

---

## 0. Decisiones de alcance del Sprint 7

| Tema | Decisión | Motivo |
|---|---|---|
| **Organización de código** | Conservar la estructura **por features** (`src/features/*`, `src/shared/*`) ya existente. No migrar a la estructura por capas del spec. | Consistencia con el resto del monorepo; menor riesgo y diff. |
| **SSO institucional (Gmail PUCP) in-app** | **Fuera de S7.** Vía oficial de login móvil = **email/password operativo** (`/auth/mobile/operator/login`). El SSO in-app (deep-link + intercambio Supabase) queda documentado como pendiente para un sprint posterior. | El callback actual de Google retorna a la **web** (cookie), sin handoff a la app; resolverlo excede S7. |
| **Contrato de sesión backend** | Alinear el cliente a lo real: `roles: string[]` (plural), `GET /api/v1/auth/me`, respuesta `{ access_token, token_type, user }`. **No** existe `permissions` ni `role` singular. | Evita un contrato inventado que el backend no expone. |
| **Tabs** | Mantener 4 tabs del spec **+ Alertas** ya existente → 5 tabs: Inicio · Incidentes · Mapa · Alertas · Perfil. | "Alertas"/Notificaciones ya está implementado y aporta valor operativo. Ver §8. |

---

## 1. Estado actual vs objetivo — matriz de brechas

Leyenda: ✅ cumple · 🟡 parcial · ❌ ausente.

| # | Requisito [REGLA] / spec | Estado | Dónde / Brecha |
|---|---|---|---|
| 1 | TypeScript estricto, sin `any` implícito | ✅ | [`tsconfig.json`](../../apps/mobile/tsconfig.json) `strict: true` |
| 2 | Sin `fetch` directo desde pantallas; servicios por dominio | ✅ | [`shared/api/client.ts`](../../apps/mobile/src/shared/api/client.ts) |
| 3 | Config externalizada por env (sin URLs hardcodeadas) | 🟡 | [`shared/config/env.ts`](../../apps/mobile/src/shared/config/env.ts) tiene `API_BASE_URL`; faltan idle/timeout/retries |
| 4 | Token **solo** en `expo-secure-store`; nunca en claro | ❌ | Token vive en `useState` ([`auth-context.tsx`](../../apps/mobile/src/features/auth/auth-context.tsx)); `expo-secure-store` no instalado |
| 5 | Rehidratación de sesión al arranque | ❌ | Existe `restoreFromToken()` pero **nadie lo invoca** |
| 6 | Máquina de estados de sesión (`UNKNOWN…EXPIRED`) | ❌ | Solo `token/user/loading/error`; gating = `if (!auth.user)` |
| 7 | Idle timeout (15 min) | ❌ | No existe (JWT backend caduca a 60 min server-side) |
| 8 | `401 → EXPIRED` (limpiar token, re-auth) | ❌ | `ApiError(401)` se lanza pero no transiciona la sesión |
| 9 | Cliente HTTP central con timeout + retries + backoff | ❌ | `request()` sin timeout ni reintentos |
| 10 | Circuit breaker | ❌ | No existe |
| 11 | `useNetworkStatus` + netinfo (FB-NET) | ❌ | `@react-native-community/netinfo` no instalado |
| 12 | Hooks de permisos (cámara/ubicación/notif.) normalizados | ❌ | Ninguno; `expo-camera/location/notifications` no instalados |
| 13 | Matriz de fallback FB-NET/5XX/AUTH/401/PERM/DATA | ❌ | Solo degradación *ad hoc* vía modo demo/mocks |
| 14 | Navegación con gating en un solo lugar | 🟡 | Gating en [`OperatorApp.tsx`](../../apps/mobile/src/bootstrap/OperatorApp.tsx) pero por `user`, no por `status`; sin React Navigation |
| 15 | Login SSO institucional | ❌→S8 | Botón abre navegador y retorna a web; sin handoff móvil |
| 16 | `logout` invalida sesión | 🟡 | Logout local; no limpia secure-store (no existe) ni llama endpoint |

---

## 2. Convenciones (apoyadas en lo existente) [REGLA]

- **Arquitectura por features.** Cada dominio en `src/features/<dominio>/`; lo transversal en `src/shared/`.
- **Pantallas:** PascalCase con sufijo `Screen` (`DashboardScreen`).
- **Hooks:** `useXxx` camelCase; **un hook por capacidad de permiso**.
- **Servicios por dominio**, jamás `fetch` directo desde una pantalla.
- **Constantes/config:** `UPPER_SNAKE_CASE`, centralizadas en `shared/config`.
- **Estados de red explícitos:** toda llamada maneja `loading/error/success` y pasa por el cliente HTTP central.
- **Sin secretos en el repo:** todo por `EXPO_PUBLIC_*` y almacenamiento seguro del dispositivo. **HTTPS** en ambientes no-locales.

### 2.1. Estructura objetivo (delta sobre lo actual)

```
apps/mobile/src/
  bootstrap/
    OperatorApp.tsx          # (existe) consume status de sesión, no user
  features/
    auth/
      auth-context.tsx       # (existe) → evoluciona a máquina de estados
      session-machine.ts     # NUEVO: estados/transiciones de sesión
      token-store.ts         # NUEVO: wrapper expo-secure-store
      use-idle-timeout.ts    # NUEVO: temporizador de inactividad
      LoginScreen.tsx         # (existe)
    operator/                 # (existe) Dashboard/Incidentes/Mapa/Alertas/Perfil
    permissions/              # NUEVO
      use-camera-permission.ts
      use-location-permission.ts
      use-notification-permission.ts
      permission-types.ts
  shared/
    api/
      client.ts              # (existe) → se apoya en http-client central
      http-client.ts         # NUEVO: timeout + retries + 401→EXPIRED
    config/
      env.ts                 # (existe) → añadir CONFIG (idle, timeout, retries)
    net/
      use-network-status.ts  # NUEVO: netinfo
    fallback/
      retry.ts               # NUEVO: withRetry + backoff
      circuit-breaker.ts      # NUEVO
      logger.ts              # NUEVO: log de eventos de fallback
    types/                    # (existe) api.ts; añadir permissions.ts, session.ts
    mocks/                    # (existe) modo demo
```

---

## 3. T110 — Configuración base

### 3.1. Dependencias a instalar

```bash
# desde apps/mobile
npx expo install expo-secure-store @react-native-community/netinfo
npx expo install expo-camera expo-location expo-notifications expo-linking
```

> No se añade React Navigation: la navegación actual por estado de tab es suficiente
> para S7 y evita un refactor mayor. Si en S8 crece, se evalúa migrar.

### 3.2. CONFIG por ambiente [REGLA]

Extender [`shared/config/env.ts`](../../apps/mobile/src/shared/config/env.ts) (mantener `API_BASE_URL` actual):

```ts
export const CONFIG = {
  API_BASE_URL,                                   // ya existe
  SESSION_IDLE_TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_IDLE_MS ?? 900_000), // 15 min
  HTTP_TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_HTTP_TIMEOUT_MS ?? 15_000),
  HTTP_MAX_RETRIES: Number(process.env.EXPO_PUBLIC_HTTP_MAX_RETRIES ?? 3),
} as const;
```

---

## 4. T111 — Autenticación y sesión

### 4.1. Máquina de estados [REGLA]

Estados: `UNKNOWN · UNAUTHENTICATED · AUTHENTICATING · AUTHENTICATED · EXPIRED`.
Las pantallas reaccionan al `status`; **nunca** leen el token directamente.

| Estado | Significado | Transiciones |
|---|---|---|
| `UNKNOWN` | Arranque; aún no se sabe si hay sesión. | → `AUTHENTICATED` (token válido) / → `UNAUTHENTICATED` |
| `UNAUTHENTICATED` | Sin sesión válida. | → `AUTHENTICATING` |
| `AUTHENTICATING` | Login en curso. | → `AUTHENTICATED` / → `UNAUTHENTICATED` (error) |
| `AUTHENTICATED` | Sesión válida; roles cargados. | → `EXPIRED` (idle/401) / → `UNAUTHENTICATED` (logout) |
| `EXPIRED` | Caducada por inactividad o 401. | → `AUTHENTICATING` (reauth) / → `UNAUTHENTICATED` |

Implementación: evolucionar [`auth-context.tsx`](../../apps/mobile/src/features/auth/auth-context.tsx) para exponer `status` + acciones (`login`, `logout`, `markExpired`, `bootstrap`), conservando los métodos existentes (`loginWithOperatorEmail`, `continueAsDemoOperator`, `restoreFromToken`).

**[REGLA]** Nunca montar vistas operativas fuera de `AUTHENTICATED`. La validez se confirma **server-side** (`GET /auth/me`), no por la mera presencia del token.

> **Modo demo:** se conserva como atajo de desarrollo, pero debe entrar a un estado
> claramente etiquetado (`AUTHENTICATED` con bandera `isDemo`) para no violar el invariante en producción. Se desactiva por env en builds no-dev.

### 4.2. Almacenamiento del token [REGLA]

Nuevo `features/auth/token-store.ts` sobre `expo-secure-store`:

```ts
import * as SecureStore from "expo-secure-store";
const TOKEN_KEY = "sc.session.token";
export const tokenStore = {
  set: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
```

Flujo de arranque (`bootstrap`): `UNKNOWN` → leer token de secure-store → si hay, `GET /auth/me` → válido `AUTHENTICATED`, 401 → `clear()` + `UNAUTHENTICATED`.

### 4.3. Cliente HTTP central [REGLA]

Nuevo `shared/api/http-client.ts` que envuelve el `request()` actual con:
- Inyección de `Authorization: Bearer <token>` (token desde `tokenStore`).
- `timeout` (`CONFIG.HTTP_TIMEOUT_MS`) y reintentos (`withRetry`, §6).
- **`401` → callback `onUnauthorized()`** que transiciona la sesión a `EXPIRED` y limpia el token. (Hoy [`client.ts`](../../apps/mobile/src/shared/api/client.ts) ya lanza `ApiError(401)`; se conecta ese punto al store.)
- Mapeo de errores backend `{ detail }` → mensaje + ruta de fallback.

Las funciones de dominio existentes (`listIncidents`, `getDashboardStats`, etc.) se mantienen y pasan a usar el cliente central.

### 4.4. Idle timeout + 401 [REGLA]

- Nuevo `use-idle-timeout.ts`: temporizador `CONFIG.SESSION_IDLE_TIMEOUT_MS`; se reinicia ante interacción y respuestas exitosas; al vencer → `EXPIRED` + `tokenStore.clear()`.
- Un `401` del backend fuerza `EXPIRED` aunque el timer local no haya vencido.

### 4.5. Logout

`logout()` → `tokenStore.clear()` + estado `UNAUTHENTICATED`. (Opcional: llamar `POST /api/v1/auth/logout`; en móvil es bearer, así que el efecto principal es local.)

---

## 5. Contrato del servicio de auth (alineado al backend real)

```ts
// types/session.ts
export type SessionStatus =
  | "UNKNOWN" | "UNAUTHENTICATED" | "AUTHENTICATING" | "AUTHENTICATED" | "EXPIRED";

// Backend real: roles es array; no hay `permissions`.
export interface AuthUser {
  id: string; email: string; nombre: string; apellido: string;
  avatar_url?: string | null; codigo_institucional?: string | null;
  telefono?: string | null; departamento?: string | null;
  roles: string[];                       // "operador" | "supervisor" | "administrador"
}
export interface AuthSession {
  access_token: string; token_type: "bearer"; user: AuthUser;
}
```

Endpoints consumidos en S7 (confirmados en [`apps/backend/app/api/v1/auth.py`](../../apps/backend/app/api/v1/auth.py)):

| Método y ruta | Propósito |
|---|---|
| `POST /api/v1/auth/mobile/operator/login` | Login email/password operativo → `{ access_token, user }` |
| `GET /api/v1/auth/me` | Validar token y traer perfil/roles (fuente de verdad; 401 si inválido) |
| `POST /api/v1/auth/logout` | Invalidar sesión (cookie web; móvil limpia token local) |
| `POST /api/v1/auth/mobile/supabase-session` | *(Reservado S8: SSO in-app)* intercambia access_token Supabase |

---

## 6. T112 — Hooks de permisos

Estados normalizados [REGLA]: `undetermined · granted · denied · blocked`.

```ts
// features/permissions/permission-types.ts
export type PermissionState = "undetermined" | "granted" | "denied" | "blocked";
export interface UsePermissionResult {
  state: PermissionState;
  request: () => Promise<PermissionState>;
  openSettings: () => Promise<void>;
  isReady: boolean;
}
```

- `use-camera-permission.ts` (expo-camera) — referencia completa en el spec original §3.3.
- `use-location-permission.ts` (expo-location) — mapa/acompañamiento, uso pleno S8.
- `use-notification-permission.ts` (expo-notifications) — push, uso pleno S8.

**[REGLA]** Permisos se solicitan en el **momento contextual**, nunca al iniciar. Una
denegación nunca bloquea la app: deriva a fallback **FB-PERM** (alternativa sin la
capacidad o guía a Ajustes con `Linking.openSettings()`).

---

## 7. T113 — Flujos de fallback

### 7.1. Matriz [REGLA]

| ID | Disparador | Detección | Comportamiento |
|---|---|---|---|
| FB-NET | Sin conectividad | netinfo offline | Banner offline; conservar input; reintentar al reconectar |
| FB-5XX | Backend 5xx/timeout | http-client | Retry backoff (máx 3); si persiste, aplazar e informar |
| FB-AUTH | SSO/proveedor caído | error en login | Mensaje de indisponibilidad; reintento; sin sesión ambigua |
| FB-401 | Token inválido/caducado | http-client 401 | → `EXPIRED`; limpiar token; pedir reauth |
| FB-PERM | Permiso denegado/bloqueado | hook de permiso | Alternativa sin la capacidad o guía a Ajustes |
| FB-DATA | Respuesta inconsistente | validación de schema | Degradar a lo disponible; loggear; no romper render |

### 7.2. Utilidades

- `shared/fallback/retry.ts` → `withRetry(fn, { retries, timeoutMs })` con backoff exponencial con tope (`min(1000·2^n, 8000)`). **`isRetryable`: solo 5xx, timeout y errores de red. Nunca 4xx (salvo 401→EXPIRED).**
- `shared/fallback/circuit-breaker.ts` → `CLOSED → OPEN → HALF_OPEN → CLOSED`; N fallos consecutivos abren el circuito por `cooldownMs`; en `OPEN` falla rápido y muestra fallback.
- `shared/fallback/logger.ts` → loggea **todo evento de fallback sin datos sensibles**.

### 7.3. Reglas de degradación [REGLA]

- Nunca perder input del usuario por fallo transitorio (conservar borrador/formulario).
- Mensajería no técnica al operador; detalle técnico al logger.
- No reintentar operaciones no idempotentes sin control; preferir aplazar e informar.
- Ante FB-DATA, mostrar lo disponible y marcar lo faltante; no inventar datos.

---

## 8. Navegación y gating de sesión

[`OperatorApp.tsx`](../../apps/mobile/src/bootstrap/OperatorApp.tsx) pasa a reaccionar al `status` (no a `user`):

```
UNKNOWN         → SplashScreen
AUTHENTICATED   → Tabs (Inicio · Incidentes · Mapa · Alertas · Perfil)
otros           → LoginScreen (con reauth si EXPIRED)
```

**[REGLA]** El gating vive **solo** en el bootstrap. Ninguna pantalla operativa se
monta fuera de `AUTHENTICATED`. Tabs = los 5 actuales (4 del spec + Alertas).

---

## 9. Plan de implementación por fases

Orden por dependencias. Cada fase deja la app compilando (`pnpm --filter @safecampus/mobile typecheck`).

**Fase 0 — Base** · `expo install` de deps; `CONFIG` en `env.ts`.
- Toca: `package.json`, `shared/config/env.ts`, `app.json` (permisos plataforma).

**Fase 1 — Persistencia + sesión** · `token-store.ts`; `session-machine.ts`; evolucionar `auth-context.tsx` (status + bootstrap + rehidratación); `OperatorApp` reacciona a `status`; Splash.
- Toca: `features/auth/*`, `bootstrap/OperatorApp.tsx`, `shared/types/session.ts`.

**Fase 2 — HTTP central + fallback núcleo** · `retry.ts`, `circuit-breaker.ts`, `logger.ts`, `http-client.ts`; conectar `client.ts`; `401 → EXPIRED`.
- Toca: `shared/fallback/*`, `shared/api/*`.

**Fase 3 — Idle + red** · `use-idle-timeout.ts`; `use-network-status.ts`; banner offline (FB-NET) en bootstrap/pantallas.
- Toca: `features/auth/use-idle-timeout.ts`, `shared/net/*`, `bootstrap/OperatorApp.tsx`.

**Fase 4 — Permisos** · 3 hooks + `permission-types.ts`; patrón de uso contextual (FB-PERM).
- Toca: `features/permissions/*` (consumo pleno cámara/foto en flujos S8).

**Fase 5 — Cierre** · alinear tipos a `roles[]`; logout con `tokenStore.clear()`; revisar mensajes no técnicos; verificación de DoD.
- Toca: `shared/types/api.ts`, `features/auth/auth-context.tsx`, pantallas.

---

## 10. Definition of Done (Sprint 7, actualizada)

Estado al cierre de fases 0–5 (typecheck en verde, 12 tests unitarios pasando).

- [x] Deps instaladas; `CONFIG` por env; sin URLs/tiempos hardcodeados (§3). → `shared/config/env.ts`, `.env.example`
- [x] Token **solo** en secure-store; rehidratación al arranque; nunca en claro ni en repo (§4.2). → `features/auth/token-store.ts`, bootstrap en `auth-context.tsx`
- [x] Máquina de estados `UNKNOWN…EXPIRED`; bootstrap reacciona a `status` (§4.1, §8). → `auth-context.tsx`, `bootstrap/OperatorApp.tsx`
- [x] Login email/password funcional; `GET /auth/me` valida; logout limpia token (§4–5).
- [x] http-client central con timeout + retries (solo 5xx/timeout/red) + `401→EXPIRED` (§4.3, §7.2). → `shared/api/http-client.ts`
- [x] Idle timeout 15 min + manejo de 401 (§4.4). → `features/auth/use-idle-timeout.ts`
- [x] Circuit breaker operativo (§7.2). → `shared/fallback/circuit-breaker.ts` (+ tests)
- [x] Hooks de permisos con `undetermined/granted/denied/blocked` + `openSettings` (§6). → `features/permissions/*` (+ tests)
- [x] Matriz FB-NET/5XX/AUTH/401/PERM/DATA implementada y testeable de forma aislada (§7).
- [x] `useNetworkStatus` + banner offline; input conservado ante fallo (§7). → `shared/net/use-network-status.ts`
- [x] Eventos de fallback logueados sin datos sensibles (§7.2). → `shared/fallback/logger.ts`
- [x] TS estricto sin `any` implícito; tabs = Inicio/Incidentes/Mapa/Alertas/Perfil (§2, §8).
- [x] SSO institucional in-app **documentado como pendiente** (fuera de S7). → §0, §11

> **Pendiente para S8:** consumo pleno de los hooks de permisos en flujos reales
> (cámara para evidencia, ubicación en mapa, push), superficie de error en UI para
> acciones del operador (cambio de estado/comentarios) y SSO institucional in-app.

---

## 11. Riesgos y notas

- **SSO móvil:** el `/auth/google/callback` actual fija cookie y redirige a `WEB_APP_URL`; no hay retorno a la app. Habilitar SSO in-app requiere redirect deep-link + `/auth/mobile/supabase-session` y config de redirect en Supabase → planificar en S8.
- **Expiración real:** el JWT backend caduca a **60 min** (`ACCESS_TOKEN_EXPIRE_MINUTES`); el idle local (15 min) es más estricto y correcto, pero un 401 puede llegar antes por caducidad server-side → ya cubierto por FB-401.
- **Modo demo:** útil para desarrollo/QA; debe quedar tras bandera de ambiente para no relajar el invariante de `AUTHENTICATED` en builds de producción.
- **Permisos en `app.json`:** añadir descripciones de uso (cámara/ubicación/notificaciones) para iOS/Android al instalar las libs.
