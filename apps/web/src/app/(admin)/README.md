# Módulo — Gestión de Usuarios (Panel de Administración)

> **Feature completa** del perfil **Administrador del sistema** para SafeCampus PUCP.
> Implementa los casos de uso **UC-GU-02 a UC-GU-07** del documento
> *"Flujos del módulo Gestión de Usuarios"* y la **matriz RBAC v1.0**
> (`Control de acceso resumido` + `Granularidad de acciones` + `Matriz RBAC principal`).

---

## 1. Resumen funcional

El panel reside en el route-group **`app/(admin)/`** y solo es visible para cuentas
con rol `admin` (ver sección *5. RBAC + guardas*). Agrupa **cuatro secciones** que
se navegan desde una barra lateral persistente:

| Ruta | Sección | Caso de uso |
|------|---------|-------------|
| `/usuarios` | **Gestión de cuentas** — alta, edición, suspensión y reactivación. | UC-GU-02 · UC-GU-03 · UC-GU-04 |
| `/roles` | **Roles y permisos** — matriz RBAC v1.0 editable (4 roles × 11 módulos). | UC-GU-05 |
| `/integraciones` | **Integraciones externas** — estado operativo de servicios y verificación manual. | UC-GU-06 |
| `/auditoria` | **Log de auditoría** — timeline central de acciones administrativas. | UC-GU-07 |

Todos los tabs comparten un **único provider** (`AdminPanelProvider`) que mantiene el
estado mock de usuarios, RBAC, integraciones y eventos de auditoría.
Cada acción administrativa **escribe automáticamente un evento en el log**.

---

## 2. Estructura de archivos

```
apps/web/src/
├── app/(admin)/
│   ├── layout.tsx                      # ⬅ monta AdminPanelProvider + sidebar + <Toaster>
│   ├── usuarios/page.tsx               # renderiza <UsuariosPanel />
│   ├── roles/page.tsx                  # renderiza <RbacMatrix />
│   ├── integraciones/page.tsx          # renderiza <IntegracionesPanel />
│   ├── auditoria/page.tsx              # renderiza <AuditoriaPanel />
│   ├── _components/
│   │   ├── admin-sidebar.tsx           # nav lateral con resaltado de ruta activa
│   │   └── admin-page-header.tsx
│   └── README.md                       # (este archivo)
│
├── constants/
│   ├── roles.ts                        # RolUsuario + EstadoUsuario + labels/badges
│   └── permissions.ts                  # Matriz RBAC v1.0 + puedeAccederAdminPanel()
│
└── features/
    ├── admin-panel/
    │   ├── context.tsx                 # 🧠 store compartido (usuarios, rbac, integ., auditoría)
    │   └── index.ts
    ├── usuarios/
    │   ├── types.ts
    │   ├── mock-data.ts                # 10 usuarios seed (comunidad, operador, supervisor, admin)
    │   ├── hooks/use-usuarios.ts
    │   ├── components/
    │   │   ├── usuarios-panel.tsx           # ensamble principal
    │   │   ├── usuario-stats-cards.tsx      # total · activos · inactivos · suspendidos
    │   │   ├── usuario-filters.tsx          # búsqueda + rol + estado
    │   │   ├── usuario-table.tsx            # tabla con avatar, badges y acciones
    │   │   ├── usuario-form-dialog.tsx      # crear / editar (RHF + Zod)
    │   │   └── usuario-suspender-dialog.tsx # confirmación con motivo (UC-GU-04)
    │   └── index.ts
    ├── roles/
    │   ├── components/rbac-matrix.tsx       # matriz editable 4 roles × 11 módulos
    │   └── index.ts
    ├── integraciones/
    │   ├── types.ts
    │   ├── mock-data.ts                     # WhatsApp · OpenAI · Maps · Gmail · SSO · Supabase
    │   ├── components/
    │   │   ├── integraciones-panel.tsx
    │   │   └── integracion-card.tsx         # incluye "Verificar ahora" (UC-GU-06)
    │   └── index.ts
    └── auditoria/
        ├── types.ts
        ├── mock-data.ts                     # eventos semilla
        ├── components/
        │   ├── auditoria-panel.tsx
        │   ├── auditoria-filters.tsx        # búsqueda + tipo + rango fechas
        │   └── auditoria-list.tsx           # timeline vertical
        └── index.ts
```

---

## 3. Flujos implementados (referencia a los UC)

### UC-GU-02 — Alta de usuario
`/usuarios` → botón **Nuevo usuario** → `UsuarioFormDialog` (modo crear).

Validaciones (`Zod`):
- Correo obligatorio con dominio `@pucp.edu.pe`.
- Código y correo **únicos** (el store rechaza duplicados).
- Nombre, código y departamento no vacíos.

Efecto en el store:
1. Se añade al inicio de `usuarios` con `estado = "activo"`.
2. Se inserta evento `usuario_creado` en `auditoria`.
3. `toast.success()` confirma al admin.

### UC-GU-03 — Edición de usuario
Menú contextual de cada fila → **Editar** → `UsuarioFormDialog` (modo editar).

- Permite cambiar rol y estado.
- **Invariante**: no se puede degradar o suspender al **último admin activo**
  (`contarAdminsActivos() <= 1`). El store devuelve `{ ok: false, mensaje }`
  y el diálogo lo muestra en un toast de error.

### UC-GU-04 — Suspensión / reactivación
Menú contextual → **Suspender cuenta** (solo si está activo/inactivo) o
**Reactivar cuenta** (si está suspendido/inactivo).

- `UsuarioSuspenderDialog` captura el **motivo obligatorio** antes de confirmar.
- Ambos caminos escriben evento (`usuario_suspendido` / `usuario_reactivado`)
  con el motivo/estado previo en `detalle`.

### UC-GU-05 — Gestión de roles y permisos
`/roles` → **RbacMatrix** renderiza todos los módulos como filas y los 4 roles
como columnas; cada celda es un `Select` con los niveles
`sí · no · parcial · consulta`.

- Cada cambio dispara `ajustarPermiso()` → evento `rbac_modificado`.
- **Invariante**: el rol `Administrador` no puede perder acceso a
  *"Gestión de usuarios y seguridad"* (siempre debe permanecer en `"sí"`).

### UC-GU-06 — Monitoreo de integraciones
`/integraciones` → 6 tarjetas (WhatsApp Business, OpenAI, Google Maps, Gmail OAuth2,
Google SSO, Supabase). Cada una muestra estado, última verificación, latencia y
mensaje operativo.

- Botón **Verificar ahora** simula una comprobación (600 ms de delay):
  - Si el estado previo es `inactivo`, se conserva.
  - En otro caso: 85% de probabilidad de quedar `operativo`, 15% `degradado`.
- Evento generado:
  - `integracion_verificada` cuando el resultado es operativo.
  - `integracion_alerta` cuando queda degradada/inactiva.

### UC-GU-07 — Log de auditoría
`/auditoria` → `AuditoriaPanel`:
- **Filtros**: texto libre, tipo de evento y rango de fechas (`desde` / `hasta`).
- Renderiza como **timeline** con icono por tipo (`UserPlus`, `ShieldOff`,
  `Activity`, `AlertTriangle`, etc.).
- El orden es **cronológico inverso** (los nuevos entran al inicio del arreglo).

---

## 4. Matriz RBAC v1.0 — resumen embebido

Se declara en [`src/constants/permissions.ts`](../../constants/permissions.ts)
y se importa por el provider como estado inicial.

| Módulo | Comunidad | Operador | Supervisor | Administrador |
|---|---|---|---|---|
| Autenticación y perfil | Sí | Sí | Sí | Sí |
| Gestión de incidentes | Parcial | Sí | Sí | Parcial |
| Dashboard georreferenciado | No | Sí | Sí | Consulta |
| KPIs y reportes | No | No | Sí | Sí |
| Alertas y notificaciones | Sí | Sí | Consulta | Consulta |
| Lost & Found | Sí | Parcial | Parcial | Sí |
| Acompañamiento seguro | Sí | No | Parcial | No |
| Integraciones y WhatsApp | No | Sí | Sí | Parcial |
| Integraciones técnicas | No | No | Parcial | Sí |
| Gestión de usuarios | No | No | No | **Sí (bloqueado)** |
| Auditoría | No | No | Parcial | Sí |

> La celda **"Gestión de usuarios / Administrador"** está *congelada* en nivel `sí`:
> el store rechaza cualquier intento de bajarla para evitar que el admin pierda
> acceso al propio panel.

---

## 5. RBAC + guardas de ruta

- [`puedeAccederAdminPanel(rol)`](../../constants/permissions.ts) centraliza la
  decisión "¿este usuario puede ver el panel?". Hoy devuelve `true` solo para `admin`.
- El login ya rutea a `/usuarios` al iniciar sesión como admin (ver
  [`features/auth/login.config.ts`](../../features/auth/login.config.ts)).
- **Pendiente (backend)**: agregar middleware Next.js que consulte el rol desde
  Supabase SSR y bloquee rutas `(admin)/*` para cualquier otro perfil.
  La utilidad `puedeAccederAdminPanel()` está lista para ese guard.

---

## 6. Diseño y UI kit

- Colores institucionales: primario `#001C55` (navy PUCP), acento `#C8102E`.
  El sidebar usa el color primario sólido en el item activo.
- **Todo el UI proviene de [`@safecampus/ui-kit`](../../../../packages/ui-kit/)**:
  `Button`, `Card`, `Table`, `Dialog`, `Select`, `Badge`, `Input`, `Textarea`,
  `DropdownMenu`, `Toaster` (sonner).
- No se duplicó ningún componente shadcn en `apps/web/src/components/ui/`
  (anti-patrón prohibido por `apps/web/AGENTS.md`).
- Los estilos visuales (badges, avatars, categoric color) se mapean desde las
  constantes `ROL_BADGE_CLASS`, `ESTADO_BADGE_CLASS`, `NIVEL_BADGE_CLASS`.
- Feedback de usuario: **toasts `sonner`** (ricos, top-right) para cada acción.

---

## 7. Datos mock y ruta al backend real

Actualmente **`packages/shared-types/src/database.types.ts` no expone todavía la
tabla `usuarios`** (solo `alembic_version` + PostGIS). Por eso el panel usa
seeds locales en lugar de `@supabase/...`:

| Recurso | Seed | Reemplazo futuro |
|---|---|---|
| Usuarios | `features/usuarios/mock-data.ts` (10 cuentas) | `GET /api/v1/usuarios` |
| Matriz RBAC | `constants/permissions.ts` (`RBAC_MATRIZ`) | `GET /api/v1/rbac` · `PATCH /api/v1/rbac` |
| Integraciones | `features/integraciones/mock-data.ts` (6 servicios) | `GET /api/v1/integraciones` · `POST /api/v1/integraciones/:id/verificar` |
| Auditoría | `features/auditoria/mock-data.ts` (6 eventos) | `GET /api/v1/auditoria?tipo=&desde=&hasta=` |

El **swap es puntual**: reemplazar los `useState(MOCK)` en `AdminPanelProvider`
por `useQuery`/`fetch` contra los endpoints anteriores y mantener las mismas
firmas públicas del context (`crearUsuario`, `editarUsuario`, `suspenderUsuario`,
`ajustarPermiso`, `verificarIntegracion`).

Las migraciones `usuarios` / `rbac` / `integraciones` / `auditoria` deben crearse
con **Alembic** (nunca con `supabase db push`) antes de activar los endpoints.

---

## 8. Comandos útiles

```bash
# Desde apps/web
pnpm dev          # next dev — http://localhost:3000
pnpm typecheck    # tsc --noEmit (actualmente verde)
pnpm lint         # eslint .
```

---

## 9. Próximos pasos sugeridos

1. **Middleware Next.js** + Supabase SSR que use `puedeAccederAdminPanel()` para
   proteger el route-group `(admin)`.
2. **Migraciones Alembic** de las tablas `usuarios`, `rbac_permiso`,
   `integraciones` y `auditoria_evento`.
3. Conectar `@safecampus/data` (Supabase client) y reemplazar los mocks del
   provider por llamadas reales.
4. Agregar exportación a CSV/Excel en el log de auditoría.
5. Tests Vitest (validación Zod del formulario, invariante "último admin activo",
   filtro de auditoría por rango de fechas).
