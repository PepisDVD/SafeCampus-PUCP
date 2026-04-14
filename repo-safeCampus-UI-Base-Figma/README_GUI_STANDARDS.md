# Estándares de Interfaz Gráfica de Usuario (GUI) de SafeCampus PUCP

## Documento de Análisis Exhaustivo del Frontend

> **Objetivo:** Este documento analiza de forma exhaustiva la interfaz gráfica del prototipo funcional de SafeCampus PUCP, un sistema de gestión de seguridad universitaria. Se examina únicamente lo que existe en el código fuente del repositorio. Se distingue entre lo **observado** (evidencia directa en el código), lo **inferido** (deducido de patrones consistentes) y lo **indeterminado** (no implementado o no verificable).

---

## Índice

1. [Arquitectura General del Frontend](#1-arquitectura-general-del-frontend)
2. [Stack Tecnológico y Dependencias](#2-stack-tecnológico-y-dependencias)
3. [Sistema de Diseño (Design Tokens)](#3-sistema-de-diseño-design-tokens)
4. [Estructura de Archivos y Organización del Código](#4-estructura-de-archivos-y-organización-del-código)
5. [Plataformas e Interfaces Diferenciadas](#5-plataformas-e-interfaces-diferenciadas)
6. [Inventario Completo de Pantallas](#6-inventario-completo-de-pantallas)
7. [Patrones de Navegación](#7-patrones-de-navegación)
8. [Componentes UI Reutilizables](#8-componentes-ui-reutilizables)
9. [Sistema Visual: Colores, Tipografía, Espaciado](#9-sistema-visual-colores-tipografía-espaciado)
10. [Patrones de Interacción y UX](#10-patrones-de-interacción-y-ux)
11. [Estrategia Responsiva y Adaptativa](#11-estrategia-responsiva-y-adaptativa)
12. [Accesibilidad](#12-accesibilidad)
13. [Consistencia entre Plataformas](#13-consistencia-entre-plataformas)
14. [Gestión del Estado y Datos](#14-gestión-del-estado-y-datos)
15. [Iconografía y Recursos Gráficos](#15-iconografía-y-recursos-gráficos)
16. [Oportunidades de Mejora Identificadas](#16-oportunidades-de-mejora-identificadas)
17. [Matriz de Trazabilidad: Casos de Uso → Pantallas](#17-matriz-de-trazabilidad-casos-de-uso--pantallas)

---

## 1. Arquitectura General del Frontend

### 1.1 Tipo de Aplicación

**Observado:** SafeCampus PUCP es una **Single Page Application (SPA)** construida con Vite + React. El punto de entrada es `src/main.tsx`, que renderiza el componente `<App />` en el elemento DOM `#root`. `App.tsx` consiste exclusivamente en un `<RouterProvider router={router} />`, delegando toda la navegación al enrutador.

### 1.2 Enrutamiento

**Observado:** El enrutamiento se define en `src/app/routes.ts` utilizando `createBrowserRouter` de `react-router` v7.13.0. La estructura de rutas es la siguiente:

| Ruta raíz | Layout | Hijos |
|---|---|---|
| `/` | — | `Login.tsx` |
| `/pwa` | `PWALayout.tsx` | `Home`, `Reportar`, `Mis-casos`, `Lost-found`, `Acompanamiento`, `Perfil` |
| `/web` | `WebLayout.tsx` | `Dashboard`, `Casos`, `KPIs`, `WhatsApp`, `Admin` |
| `/operador` | `OperadorLayout.tsx` | `Dashboard`, `Incidentes`, `Mapa`, `Perfil` |

### 1.3 Patrón Layout + Outlet

**Observado:** Cada interfaz principal (PWA, Web, Operador) utiliza un componente Layout que define la estructura de chrome (barra superior, navegación, frame) y renderiza `<Outlet />` para el contenido dinámico de cada ruta hija. Este patrón garantiza consistencia estructural dentro de cada plataforma.

---

## 2. Stack Tecnológico y Dependencias

### 2.1 Dependencias Principales

**Observado** en `package.json`:

| Tecnología | Versión | Propósito |
|---|---|---|
| React | 18.3.1 | Framework UI |
| react-router | 7.13.0 | Enrutamiento SPA |
| Vite | 6.3.5 | Build tool y dev server |
| Tailwind CSS | 4.1.12 | Framework CSS utility-first |
| @tailwindcss/vite | 4.1.12 | Plugin Vite para Tailwind |
| Radix UI (múltiples) | ~2.x | Primitivas accesibles sin estilo (base de shadcn/ui) |
| class-variance-authority | 0.7.1 | Gestión de variantes de componentes |
| clsx + tailwind-merge | 2.1.1 / 3.0.2 | Utilidad para merge de clases CSS |
| lucide-react | 0.487.0 | Biblioteca de íconos |
| recharts | 2.15.2 | Gráficos y visualizaciones |
| @mui/material | 7.3.5 | Componentes Material UI |
| @emotion/react + styled | 11.14.0 / 11.14.0 | CSS-in-JS para MUI |
| motion (Framer Motion) | 12.23.24 | Animaciones |
| react-hook-form | 7.56.4 | Formularios |
| react-dnd + html5-backend | 16.0.1 | Drag & drop |
| embla-carousel-react | 8.6.0 | Carrusel |
| sonner | 2.0.3 | Notificaciones tipo toast |
| vaul | 1.1.2 | Drawer inferior |
| cmdk | 1.1.1 | Command palette |
| canvas-confetti | 1.9.3 | Efectos visuales |
| date-fns | 4.1.0 | Manipulación de fechas |
| react-day-picker | 9.7.0 | Selector de fechas |
| tw-animate-css | 1.2.9 | Animaciones CSS para Tailwind |

### 2.2 Herramientas de Build

**Observado** en `vite.config.ts`:
- Plugin `@tailwindcss/vite` para procesamiento de Tailwind.
- Alias `@` → `./src` para importaciones limpias.
- `postcss.config.mjs` presente pero Tailwind se procesa vía plugin Vite (no PostCSS).

### 2.3 Nota sobre MUI

**Observado:** MUI Material 7.3.5 está instalado como dependencia, pero **no se detecta su uso en ninguna página o componente analizado**. Todas las interfaces utilizan componentes shadcn/ui o componentes Tailwind custom. Se infiere que MUI fue añadido previsoriamente o explorado sin llegar a integrarse.

---

## 3. Sistema de Diseño (Design Tokens)

### 3.1 Tokens CSS (Custom Properties)

**Observado** en `src/styles/theme.css`:

El sistema de tokens está definido mediante CSS custom properties en `:root` y un variante `.dark`. Se utiliza el formato `oklch` para colores semánticos y hex para valores concretos.

#### Tokens de Color (modo claro — `:root`)

| Token | Valor | Uso semántico |
|---|---|---|
| `--background` | `#ffffff` | Fondo de página |
| `--foreground` | `oklch(0.145 0 0)` ≈ negro | Texto principal |
| `--primary` | `#030213` | Color primario del sistema de diseño |
| `--primary-foreground` | `oklch(1 0 0)` = blanco | Texto sobre primario |
| `--secondary` | `oklch(0.95 0.0058 264.53)` ≈ gris claro azulado | Fondos secundarios |
| `--muted` | `#ececf0` | Fondos atenuados |
| `--muted-foreground` | `#717182` | Texto secundario |
| `--accent` | `#e9ebef` | Fondos de acento |
| `--destructive` | `#d4183d` | Acciones destructivas / alertas |
| `--border` | `rgba(0, 0, 0, 0.1)` | Bordes generales |
| `--input-background` | `#f3f3f5` | Fondo de inputs |
| `--radius` | `0.625rem` (10px) | Radio base para bordes redondeados |

#### Tokens de Gráficos (Chart)

| Token | Valor approx. |
|---|---|
| `--chart-1` | Naranja |
| `--chart-2` | Teal |
| `--chart-3` | Azul oscuro |
| `--chart-4` | Amarillo |
| `--chart-5` | Naranja claro |

#### Tokens de Sidebar

| Token | Uso |
|---|---|
| `--sidebar` | Fondo sidebar |
| `--sidebar-primary` | Color activo sidebar |
| `--sidebar-accent` | Hover sidebar |
| `--sidebar-border` | Borde sidebar |

### 3.2 Modo Oscuro

**Observado:** El selector `.dark` redefine todos los tokens con valores invertidos. La activación se hace mediante `@custom-variant dark (&:is(.dark *))`, lo que requiere una clase `.dark` en un ancestro. **Sin embargo**, no se encontró toggle de dark mode implementado en ninguna interfaz del usuario. Los tokens oscuros existen pero no se utilizan activamente en las páginas analizadas.

**Nota importante:** La interfaz del Operador implementa su propio dark theme **sin usar los tokens** del sistema de diseño, utilizando colores inline como `bg-[#0d1117]` y `bg-[#161b22]`.

### 3.3 Tipografía Base

**Observado** en `theme.css`, capa `@layer base`:

| Elemento | Tamaño | Peso | Line-height |
|---|---|---|---|
| `html` | `var(--font-size)` = 16px | — | — |
| `h1` | `var(--text-2xl)` | 500 (medium) | 1.5 |
| `h2` | `var(--text-xl)` | 500 | 1.5 |
| `h3` | `var(--text-lg)` | 500 | 1.5 |
| `h4` | `var(--text-base)` | 500 | 1.5 |
| `label` | `var(--text-base)` | 500 | 1.5 |
| `button` | `var(--text-base)` | 500 | 1.5 |
| `input` | `var(--text-base)` | 400 (normal) | 1.5 |

**Inferido:** Estas definiciones base son sobrescritas extensivamente por clases Tailwind en cada componente (ej. `text-xs`, `text-sm`, `text-lg`).

### 3.4 Framework de Radios

**Observado** en el bloque `@theme inline`:

| Token Tailwind | Cálculo |
|---|---|
| `--radius-sm` | `calc(0.625rem - 4px)` = 6px |
| `--radius-md` | `calc(0.625rem - 2px)` = 8px |
| `--radius-lg` | `0.625rem` = 10px |
| `--radius-xl` | `calc(0.625rem + 4px)` = 14px |

**Observado en páginas:** Los componentes no usan estas variables de radio; en su lugar aplican directamente `rounded-xl` (~12px), `rounded-2xl` (~16px) y `rounded-3xl` (~24px) de Tailwind. Esto representa una **desconexión** entre los tokens de diseño definidos y los radios realmente usados.

---

## 4. Estructura de Archivos y Organización del Código

### 4.1 Árbol de Directorios

```
src/
├── main.tsx                          # Punto de entrada
├── app/
│   ├── App.tsx                       # Router provider
│   ├── routes.ts                     # Definición de rutas
│   ├── components/
│   │   ├── figma/
│   │   │   └── ImageWithFallback.tsx # Componente de imagen con fallback
│   │   └── ui/                       # ~35 componentes shadcn/ui
│   │       ├── button.tsx
│   │       ├── badge.tsx
│   │       ├── card.tsx
│   │       ├── sidebar.tsx
│   │       ├── utils.ts              # Función cn() para merge de clases
│   │       ├── use-mobile.ts         # Hook useIsMobile() (breakpoint 768px)
│   │       └── ... (30+ componentes Radix/shadcn)
│   ├── data/
│   │   └── mockData.ts              # Tipos TypeScript + datos mock
│   └── pages/
│       ├── Login.tsx                 # Pantalla de login multi-rol
│       ├── pwa/                      # 6 páginas de interfaz estudiante
│       ├── web/                      # 5 páginas de interfaz supervisor
│       └── operador/                 # 4 páginas de interfaz operador
├── imports/
│   └── pasted_text/
│       └── gestion-usuarios-seguridad.md  # Especificación de casos de uso
└── styles/
    ├── index.css                     # Importador maestro
    ├── fonts.css                     # Vacío (sin fuentes custom)
    ├── tailwind.css                  # Config Tailwind v4
    └── theme.css                     # Design tokens y tipografía base
```

### 4.2 Convenciones de Nombrado

**Observado:**
- Páginas: `PascalCase` con prefijo de plataforma — `PWAHome.tsx`, `WebDashboard.tsx`, `OperadorMapa.tsx`.
- Componentes UI: `kebab-case` — `button.tsx`, `alert-dialog.tsx`, `scroll-area.tsx`.
- Layouts: `{Plataforma}Layout.tsx` — `PWALayout.tsx`, `WebLayout.tsx`, `OperadorLayout.tsx`.
- Datos: `camelCase` — `mockData.ts`.

### 4.3 Patrón de Componentes

**Observado:** Las páginas no importan ni utilizan los componentes shadcn/ui de `components/ui/`. En su lugar, **cada página construye su propia UI directamente con clases Tailwind**. Los componentes shadcn/ui están disponibles pero se comportan como una biblioteca latente. La única excepción es el componente `sidebar.tsx`, que consume `button.tsx`, `input.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx` y `tooltip.tsx` internamente.

**Inferido:** Este patrón sugiere que las páginas fueron desarrolladas como prototipos rápidos (posiblemente generados desde Figma o mediante IA) y los componentes reutilizables aún no fueron integrados.

---

## 5. Plataformas e Interfaces Diferenciadas

SafeCampus implementa **tres interfaces** diferenciadas dentro de la misma SPA, dirigidas a perfiles de usuario distintos. A esto se suma la pantalla de Login que actúa como selector de rol.

### 5.1 Tabla Comparativa

| Aspecto | PWA (Estudiante) | Web Operativa (Supervisor) | Operador |
|---|---|---|---|
| **Ruta base** | `/pwa` | `/web` | `/operador` |
| **Layout** | `PWALayout.tsx` | `WebLayout.tsx` | `OperadorLayout.tsx` |
| **Frame visual** | Phone frame `max-w-[430px]` | Fullscreen con sidebar colapsable | Phone frame `max-w-[430px]` |
| **Fondo del frame** | `bg-gray-50` | `bg-gray-50` | `bg-gray-900` |
| **Fondo del contenido** | `bg-white` | `bg-gray-50` | `bg-[#0d1117]` |
| **Navegación principal** | Bottom tab bar (5 items) | Sidebar izquierdo (5 items) | Bottom tab bar (4 items) |
| **Tema de color** | Claro, azul `#001C55` | Claro, azul `#001C55` | Oscuro, naranja `#F97316` |
| **Personalidad visual** | Amigable, redondeado | Profesional, denso | Operativo, alto contraste |
| **Simulación de barra de estado** | Sí (clara, hora + batería) | No | Sí (oscura, indicador "EN SERVICIO") |
| **Nº de páginas** | 6 | 5 | 4 |

### 5.2 PWA — Interfaz Estudiante

**Observado ** en `PWALayout.tsx`:

- Envoltorio: `min-h-screen flex items-start justify-center bg-gray-50` con contenido en `max-w-[430px]`.
- Barra de estado simulada: hora `9:41`, señal, batería (elementos SVG/div).
- Header fijo: fondo `bg-white`, logo PUCP (ícono `Shield` + `MapPin`), texto "SafeCampus" en azul `#001C55`, subtítulo "Seguridad PUCP" en gris.
- Navegación inferior: 5 pestañas (`Inicio`, `Reportar`, `Mis casos`, `Lost & Found`, `Perfil`), highlight azul `#001C55` con fondo `bg-[#001C55]/10` cuando activo.
- `pb-20` en el contenido para compensar el navbar fixed.

### 5.3 Web Operativa — Interfaz Supervisor

**Observado** en `WebLayout.tsx`:

- Layout de dos columnas: sidebar izquierdo + área de contenido.
- Sidebar: fondo navy `bg-[#001C55]`, ancho ~250px, colapsable.
- Navegación en sidebar: 5 items (`Dashboard`, `Gestión de Casos`, `KPIs y Reportes`, `Chat WhatsApp`, `Admin Sistema`) con íconos `lucide-react`.
- Item activo: `bg-white/20 text-white`, otros: `text-white/60 hover:bg-white/10`.
- Top bar: alertas críticas (badge rojo), notificaciones (bell), avatar usuario con dropdown.
- Logo en sidebar: "SafeCampus" + "Sistema de Seguridad" en blanco.
- Soporte móvil: hamburger menu que abre sidebar como overlay.

### 5.4 Operador — Interfaz de Campo

**Observado** en `OperadorLayout.tsx`:

- Phone frame idéntico al PWA en dimensiones (`max-w-[430px]`), pero con tema oscuro.
- Fondo general: `bg-gray-900`, contenido: `bg-[#0d1117]`.
- Barra de estado simulada oscura: indicador verde pulsante + "EN SERVICIO" en verde.
- Header: ícono `Shield` en naranja sobre fondo `bg-orange-500/20`, "SafeCampus" blanco, "Operador · Turno Mañana" en naranja.
- Botón "Salir" en esquina superior derecha (borde gris, texto gris).
- Navegación inferior oscura: fondo `bg-[#161b22]`, borde `border-gray-800`, 4 items (`Dashboard`, `Incidentes`, `Mapa`, `Perfil`).
- Ítem activo: color `text-orange-400` con fondo `bg-orange-500/15`.

---

## 6. Inventario Completo de Pantallas

### 6.1 Login (`Login.tsx` — ruta `/`)

**Funcionalidad observada:**
- Pantalla de selección de rol con 4 perfiles.
- Fondo degradado: `#001C55` → `#003087` → `#C8102E`.
- Layout de dos columnas en desktop: panel informativo izquierdo + formulario derecho.
- Formulario: input de correo + input de contraseña (simulados, no validados contra backend).
- 4 tarjetas de rol con código de color y routing:

| Rol | Color | Redirige a |
|---|---|---|
| Estudiante / Comunidad | Azul `#3B82F6` | `/pwa` |
| Operador de Seguridad | Naranja `#F97316` | `/operador` |
| Supervisor de Seguridad | Verde `#10B981` | `/web` |
| Administrador del Sistema | Morado `#8B5CF6` | `/web/admin` |

- Simulación de autenticación: loading spinner de 1.5 segundos antes de navegar.
- Panel informativo muestra 4 features con íconos (Shield, Radio, MapPin, BarChart3).
- **Sin autenticación real**: no hay llamadas HTTP, tokens, ni SSO. Estado local `useState` únicamente.

### 6.2 Pantallas PWA (Estudiante)

#### 6.2.1 PWAHome (`src/app/pages/pwa/PWAHome.tsx` — ruta `/pwa`)

| Sección | Descripción |
|---|---|
| Banner de bienvenida | Gradiente `#001C55`→`#003087`, saludo con nombre "María", estado "Todo tranquilo" |
| Acciones rápidas | Grid 2×2: Reportar (rojo), Mis casos (azul), Lost & Found (ámbar), Acompañamiento (verde) |
| Botón SOS | Rojo `bg-red-600`, icono `AlertTriangle`, texto "EMERGENCIA", sombra `shadow-red-200`, ancho completo, animación pulse en el ícono |
| Alerta del campus | Card informativa con ícono `Megaphone`, borde izquierdo naranja |
| Casos recientes | Lista de 2 incidentes del usuario, con severidad dot + título + zona |
| Tips de seguridad | 3 tarjetas de consejo con emojis como íconos |

#### 6.2.2 PWAReportar (`src/app/pages/pwa/PWAReportar.tsx` — ruta `/pwa/reportar`)

**Patrón:** Wizard de 3 pasos con indicador de progreso.

| Paso | Contenido |
|---|---|
| **1 — Tipo** | Grid de 7 tipos de incidente (robo, accidente, incendio, violencia, emergencia médica, vandalismo, sospechoso) como tarjetas seleccionables con emoji + label. Selección destacada con borde azul y fondo azul claro. |
| **2 — Detalle** | Textarea para descripción (mín. inferido: no hay validación), selector de severidad en 3 niveles (critico/alto/medio) con código de color (rojo/naranja/ámbar), placeholder de cámara para evidencia fotográfica. |
| **3 — Ubicación** | Dropdown de zona (8 opciones), mapa SVG estático del campus con indicador de "Mi ubicación". |
| **Resumen** | Card de confirmación con todos los datos, botón "Enviar reporte". |
| **Éxito** | Pantalla con ícono `CheckCircle` verde, ID de seguimiento simulado (`INC-2026-XXX`), botón para volver al inicio. |

Barra de progreso: segmentos coloreados azul `#001C55` (completados) y gris (pendientes).

#### 6.2.3 PWAMisCasos (`src/app/pages/pwa/PWAMisCasos.tsx` — ruta `/pwa/mis-casos`)

- Lista de incidentes filtrados por `reportedBy === 'María García López'`.
- Cada tarjeta muestra: dot de severidad, ID, badge de estado, título, ubicación y hora.
- Vista detalle (drill-down dentro del mismo componente): card de estado, grid de detalles (tipo, ubicación, zona, canal, asignado, fecha), descripción, timeline con historial de acciones.
- Estado vacío: emoji + texto centrado.
- CTA inferior: "¿Necesitas ayuda?" con botón de contacto.

#### 6.2.4 PWALostFound (`src/app/pages/pwa/PWALostFound.tsx` — ruta `/pwa/lost-found`)

- Filtros de tipo: `Todos` / `Perdido` / `Encontrado` (botones pill).
- Filtros de categoría: scroll horizontal de chips (Electrónicos, Documentos, Ropa, Accesorios, Libros, Otros).
- Barra de búsqueda con ícono `Search`.
- Lista de items con borde izquierdo de color (rojo=perdido, verde=encontrado), categoría, descripción, ubicación, fecha, reportante.
- Formulario de registro: tipo (perdido/encontrado), categoría (select), descripción (textarea), ubicación (input), fecha (input date), foto (placeholder).

#### 6.2.5 PWAAcompanamiento (`src/app/pages/pwa/PWAAcompanamiento.tsx` — ruta `/pwa/acompanamiento`)

**Patrón:** Máquina de estados con 4 estados (`idle` → `configuring` → `active` → `alerta`).

| Estado | UI |
|---|---|
| **idle** | Hero con gradiente azul + ícono shield, 3 feature cards, botón "Iniciar acompañamiento", nota sobre permisos de ubicación. |
| **configuring** | Select de destino (9 opciones), selector de duración (7 opciones: 5–60 min) como grid de botones, panel informativo "¿Cómo funciona?", botón de inicio (deshabilitado hasta seleccionar destino). |
| **active** | Temporizador circular SVG (circumference-based) con cuenta regresiva, indicador "Seguridad está monitoreando", mapa SVG con dot móvil (`progress * 180`), botón SOS rojo, botón "Llegué segura" verde. El color del timer cambia: azul → ámbar (>50%) → rojo (>75%). |
| **alerta** | Ícono `AlertTriangle` rojo pulsante, "¡ALERTA ACTIVADA!", información enviada a seguridad (destino, duración, usuario), botones "Llegué segura – Cancelar alerta" y "Solicitar ayuda urgente". |

Timer implementado con `useEffect` + `setInterval` (1 segundo).

#### 6.2.6 PWAPerfil (`src/app/pages/pwa/PWAPerfil.tsx` — ruta `/pwa/perfil`)

| Sección | Contenido |
|---|---|
| Header de perfil | Gradiente azul, avatar con iniciales "MG", nombre, carrera, correo, stats (reportes/activos/resueltos). |
| Información personal | Lista: código, facultad, correo, teléfono, rol. Cada item con ícono en fondo gris. |
| Notificaciones | 4 notificaciones recientes de `mockNotifications`. Badge rojo si hay no leídas. Tipo-color: success=verde, info=azul, warning=ámbar. |
| Preferencias | 3 items de menú: Notificaciones push, Privacidad, Editar perfil. |
| Logout | Botón rojo `bg-red-50 border-red-200 text-red-600`. Navega a `/`. |

### 6.3 Pantallas Web Operativa (Supervisor)

#### 6.3.1 WebDashboard (`src/app/pages/web/WebDashboard.tsx` — ruta `/web`)

| Sección | Descripción |
|---|---|
| Filtros temporales | 3 botones: Hoy, Esta semana, Este mes. Activo: `bg-[#001C55] text-white`. |
| KPI Cards | 6 tarjetas con ícono, valor numérico, label y badge de tendencia. Cardbg-white, shadow-sm. Colores: azul, verde, naranja, rojo, ámbar, morado. |
| Mapa SVG | Mapa del campus con edificios coloreados, incidentes como markers circulares animados (pulse para críticos). Leyenda de severidad. Click para seleccionar incidentes. |
| Feed de incidentes activos | Panel lateral con lista scrollable de incidentes, dot de severidad, badge de estado, ubicación, hora. |
| Tabla de incidentes recientes | Tabla HTML con columnas: ID, Título, Severidad, Estado, Zona, Canal, Fecha. Badges de color según estado y severidad. |

#### 6.3.2 WebCasos (`src/app/pages/web/WebCasos.tsx` — ruta `/web/casos`)

**Patrón:** Vista dual (Tabla + Kanban) con toggle.

| Componente | Detalle |
|---|---|
| Barra de filtros | Búsqueda por texto, filtro por severidad (select), filtro por estado (select). |
| Vista Tabla | Tabla completa con columnas: ID, Título, Tipo, Severidad, Estado, Zona, Asignado, Fecha. Click en fila abre detalle. |
| Vista Kanban | 5 columnas: Nuevo (blue), En atención (amber), Pendiente (orange), Resuelto (green), Cerrado (gray). Drag & drop **no implementado** — solo visual. Cards con severidad, ID, título, ubicación. |
| Panel de detalle | Panel lateral derecho: info del caso, descripción, historial como timeline, acciones (Escalar, Cerrar caso, Notificar). |

#### 6.3.3 WebKPIs (`src/app/pages/web/WebKPIs.tsx` — ruta `/web/kpis`)

| Sección | Detalle |
|---|---|
| KPI Cards | 6 métricas: Total incidentes, Tiempo promedio de respuesta, Tasa de resolución, Incidentes críticos, SLA cumplido, Satisfacción usuario. |
| Gráfico de línea | `recharts.LineChart` — Evolución de incidentes en los últimos 7 días. Línea azul `#001C55`. |
| Gráfico de pie | `recharts.PieChart` — Distribución por tipo de incidente. 5 colores. |
| Gráfico de barras | `recharts.BarChart` — Incidentes por zona del campus. Barras azules `#001C55`. |
| SLA Indicators | 4 barras de progreso circulares con porcentajes y umbrales de color (≥90 verde, ≥70 ámbar, <70 rojo). |
| Exportar reporte | Sección con filtros de fecha (inicio/fin), severidad, zona, y botones CSV y PDF. **Solo UI — sin generación real de archivos.** |

#### 6.3.4 WebAdmin (`src/app/pages/web/WebAdmin.tsx` — ruta `/web/admin`)

**Patrón:** 4 pestañas (tabs).

| Tab | Contenido |
|---|---|
| **Usuarios** | Tabla de usuarios de `mockUsers`: nombre, rol, email, departamento, estado, último login. Badges de estado (activo=verde, inactivo=gris, suspendido=rojo). Badge de rol (comunidad=azul, operador=naranja, supervisor=verde, admin=morado). Botones Editar/Eliminar. Formulario modal de Nuevo usuario (nombre, email, rol select, departamento). |
| **Roles y Permisos** | Matriz de permisos renderizada como grid. Roles en columnas (Admin, Supervisor, Operador, Comunidad). Permisos en filas (Dashboard, Gestión de casos, KPIs, Administración, Mapa operativo, Reportar incidentes, Acompañamiento). Checkmarks y X indican habilitación. |
| **Integraciones** | 4 tarjetas de estado: WhatsApp Business, Correo Institucional, API de Ubicación, Sistema Académico. Cada una con estado (activo/error/mantenimiento/configurando), endpoint URL, última sincronización, y badges de color. |
| **Auditoría** | Log de acciones recientes: usuario, acción, detalle, fecha/hora. Tipo de severidad por color de badge (success, warning, info, error). Scroll dentro del contenedor. |

#### 6.3.5 WebWhatsApp (`src/app/pages/web/WebWhatsApp.tsx` — ruta `/web/whatsapp`)

| Componente | Detalle |
|---|---|
| Barra de stats | 4 contadores: activas, esperando, con agente, con bot. |
| Panel de conversaciones | Lista a la izquierda con búsqueda y filtros (todas, esperando, con agente, con bot). Cada item: avatar WhatsApp verde, nombre, último mensaje, hora, badge de no leídos, badge de estado. |
| Vista de mensajes | Burbujas de chat diferenciadas: usuario (verde claro, alineado derecha), bot (blanco, alineado izquierda), agente (azul claro, alineado izquierda). Indicadores "BOT RESPONDE" / "AGENTE EN LÍNEA". |
| Barra de acciones | Botones: Tomar conversación, Asignar, Vincular incidente, Cerrar. |
| Panel de información | Datos del usuario, timeline de la conversación. |
| Modal de asignación | Select de operador + select de prioridad + textarea motivo. |

### 6.4 Pantallas Operador

#### 6.4.1 OperadorDashboard (`src/app/pages/operador/OperadorDashboard.tsx` — ruta `/operador`)

| Sección | Descripción |
|---|---|
| Reloj y estado | Reloj en tiempo real (`setInterval` 1s), fecha completa, indicador "EN SERVICIO" verde, turno y código de operador. Card `bg-[#161b22]`. |
| Alertas críticas | Cards rojo oscuro `bg-red-900/20` con borde rojo, íconos pulsantes, para incidentes críticos no resueltos. Click navega a incidentes. |
| Estadísticas rápidas | Grid 3 columnas: Mis activos (naranja), Sin asignar (rojo), Resueltos hoy (verde). |
| Mis casos activos | Lista de máx. 3 casos, con borde izquierdo de severidad, ID, badge estado, título, zona. |
| Acciones rápidas | Grid 2×2: Nuevo caso (naranja), Ver mapa (azul), Alerta de Emergencia (rojo, span 2 columnas, con `animate-pulse`). |
| Estado de radio | Card con información de canal de radio y operadores activos. |
| Modal SOS | Overlay negro 80%, card oscura con borde rojo, confirmación para activar protocolo de emergencia. |

#### 6.4.2 OperadorIncidentes (`src/app/pages/operador/OperadorIncidentes.tsx` — ruta `/operador/incidentes`)

| Componente | Detalle |
|---|---|
| Búsqueda | Input con ícono `Search`, fondo oscuro, placeholder claro. |
| Filtros | Chips horizontales de estado (Todos, Nuevo, En atención, Pendiente, Resuelto) + botón "Mis casos". Activo: `bg-orange-500`. |
| Lista | Cards dark `bg-[#161b22]` con borde izquierdo de severidad, ID mono, badge estado, título, zona, hora, operador asignado. |
| Vista detalle | Header con botón X para cerrar, ID y título. Cards de estado y severidad. Grid de información: tipo, ubicación, zona, canal, reportante, asignado, fecha. Descripción. Historial (timeline). Sección de nota nueva (textarea + botón foto + guardar). Acciones inferiores: Asignar, Escalar, Notificar (grid 3 col), Marcar como resuelto (botón verde). |
| Estado vacío | Emoji 📭 + "Sin incidentes" + sugerencia de filtros. |

#### 6.4.3 OperadorMapa (`src/app/pages/operador/OperadorMapa.tsx` — ruta `/operador/mapa`)

| Componente | Detalle |
|---|---|
| Filtros de capa | Chips: Todos, Crítico, Alto, Medio, Bajo + botón "Capas". Activo: `bg-orange-500`. |
| Mapa SVG | Viewport 400×320, fondo dark `#1a2332`, grid pattern. Edificios coloreados temáticamente (Biblioteca=azul, Pabellones=marrón/morado, Cafetería=ámbar, etc.). "Mi posición" como círculo azul pulsante con animación SVG. Marcadores de incidentes como círculos con color de severidad. Críticos: pulso radiante animado. Click para seleccionar/deseleccionar. Leyenda de colores. |
| Detalle seleccionado | Card con dot de severidad, ID, título, ubicación. |
| Lista "en tu zona" | Máx. 4 incidentes cercanos. Highlight de borde naranja para seleccionado. |

#### 6.4.4 OperadorPerfil (`src/app/pages/operador/OperadorPerfil.tsx` — ruta `/operador/perfil`)

| Sección | Contenido |
|---|---|
| Card de perfil | Avatar con iniciales "JS" naranja, nombre, rol "Operador de Seguridad", código OP-023, turno. 4 stats: casos asignados, resueltos, FRT promedio, horas en turno. |
| Información | Lista dark: teléfono de turno, canal de radio, zona asignada, turno actual, estado en sistema. |
| Actividad de hoy | Lista de 3 incidentes asignados con dot de estado. |
| Preferencias | Notificaciones de turno, Preferencias de app. |
| Logout | Botón "Finalizar turno y cerrar sesión" rojo oscuro. |

---

## 7. Patrones de Navegación

### 7.1 Navegación Global

| Interfaz | Tipo | Posición | Nº Items | Implementación |
|---|---|---|---|---|
| PWA | Bottom tab bar | Fixed bottom | 5 | `NavLink` de react-router con `end` prop |
| Web | Sidebar colapsable | Fixed left | 5 | `NavLink` con clase condicional `isActive` |
| Operador | Bottom tab bar | Fixed bottom | 4 | `NavLink` con `end` prop |

### 7.2 Navegación Intra-Página

**Observado:**
- **Drill-down con estado local:** Las páginas `PWAMisCasos`, `WebCasos`, `OperadorIncidentes` implementan el detalle como estado local (`useState<Incident | null>`), no como subruta. El usuario "navega" al detalle cambiando estado, no URL.
- **Tabs:** `WebAdmin` usa tabs con estado local (`activeTab`), no react-router.
- **Wizard:** `PWAReportar` usa pasos numerados con `useState<number>` (1–4).
- **Máquina de estados:** `PWAAcompanamiento` usa un tipo unión `'idle' | 'configuring' | 'active' | 'alerta'`.
- **Toggle de vista:** `WebCasos` alterna entre tabla y kanban con `useState('table' | 'kanban')`.

### 7.3 Navegación entre Interfaces

**Observado:** El Login (`/`) es el único punto de conmutación entre interfaces. Cada layout tiene un botón de cierre de sesión que navega a `/`. No existe navegación cruzada entre PWA, Web y Operador.

### 7.4 Retronavegación

**Observado:** Las vistas de detalle incluyen un botón de retroceso (ícono `X` o `ChevronLeft`) que reinicia el estado local a `null`. No se utiliza `navigate(-1)` ni el historial del navegador para la retronavegación intra-página.

---

## 8. Componentes UI Reutilizables

### 8.1 Biblioteca shadcn/ui

**Observado** en `src/app/components/ui/`: Se identifican ~35 componentes pre-configurados siguiendo el patrón shadcn/ui (wrappers de Radix UI con clases Tailwind):

| Categoría | Componentes |
|---|---|
| **Entrada** | `button`, `input`, `textarea`, `checkbox`, `radio-group`, `select`, `slider`, `switch`, `toggle`, `toggle-group`, `calendar`, `input-otp` |
| **Layout** | `card`, `separator`, `resizable`, `aspect-ratio`, `scroll-area` |
| **Overlay** | `dialog`, `alert-dialog`, `drawer`, `sheet`, `popover`, `hover-card`, `tooltip`, `dropdown-menu`, `context-menu`, `menubar` |
| **Feedback** | `alert`, `badge`, `progress`, `skeleton`, `sonner` |
| **Navegación** | `breadcrumb`, `navigation-menu`, `pagination`, `sidebar`, `tabs`, `command` |
| **Data** | `table`, `accordion`, `collapsible`, `carousel`, `chart` |
| **Composición** | `form` (react-hook-form), `label` |

### 8.2 Arquitectura de Componentes (Ejemplo: `button.tsx`)

**Observado:**
- Usa `class-variance-authority` (cva) para definir variantes.
- 6 variantes de estilo: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
- 4 variantes de tamaño: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (size-9).
- Soporta `asChild` (slot pattern de Radix) para polimorfismo.
- Usa `cn()` de `utils.ts` para merge de clases.
- Incluye estados: `focus-visible`, `disabled`, `aria-invalid`.

### 8.3 Componente `ImageWithFallback`

**Observado** en `src/app/components/figma/ImageWithFallback.tsx`:
- Componente de imagen con estado de error.
- Al fallar la carga, muestra un SVG placeholder gris con ícono de imagen rota.
- Preserva el `src` original en `data-original-url`.

### 8.4 Utilidades

**`cn()` — `src/app/components/ui/utils.ts`:**
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
Combina `clsx` (condicional de clases) con `tailwind-merge` (resolución de conflictos Tailwind).

**`useIsMobile()` — `src/app/components/ui/use-mobile.ts`:**
- Breakpoint: `768px`.
- Usa `window.matchMedia` con listener de cambio.
- Retorna `boolean`.

### 8.5 Uso Real de Componentes shadcn/ui en Páginas

**Observado:** Las páginas **no importan** componentes de `components/ui/`. Cada página construye su interfaz directamente con HTML + clases Tailwind. Ejemplo: en lugar de usar `<Badge variant="destructive">`, las páginas crean badges inline como `<span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">`.

**Inferido:** Los componentes shadcn/ui están disponibles como catálogo pero no fueron integrados al flujo de desarrollo de las páginas. Esto reduce la consistencia y aumenta la duplicación de estilos.

---

## 9. Sistema Visual: Colores, Tipografía, Espaciado

### 9.1 Paleta de Colores Aplicados

#### Colores de Marca (hardcoded en páginas)

| Color | Hex | Uso |
|---|---|---|
| Navy Principal | `#001C55` | Primary en PWA y Web: headers, botones, textos destacados |
| Azul Secundario | `#003087` | Gradientes, fondos secundarios |
| Rojo PUCP | `#C8102E` | Gradiente del Login, accent |
| Dark Base | `#0d1117` | Fondo principal del Operador |
| Dark Surface | `#161b22` | Cards y superficies del Operador |
| Naranja Operador | `#F97316` / `orange-500` | Acento primario del Operador |
| WhatsApp Verde | `#25D366` | Avatares en módulo WhatsApp |
| Rojo Destructivo | `#d4183d` | Token `--destructive` |

#### Sistema de Colores de Estado

| Estado | Color Tailwind | Uso |
|---|---|---|
| `nuevo` | `blue-500` / `blue-400` (dark) | Badge, dot |
| `en_atencion` | `amber-500` / `amber-400` (dark) | Badge, dot |
| `pendiente` | `orange-500` / `orange-400` (dark) | Badge, dot |
| `resuelto` | `green-500` / `green-400` (dark) | Badge, dot |
| `cerrado` | `gray-500` / `gray-400` (dark) | Badge, dot |

#### Sistema de Colores de Severidad

| Severidad | Color Tailwind | Hex en mapas |
|---|---|---|
| `critico` | `red-500` / `red-400` (dark) | `#EF4444` |
| `alto` | `orange-400` / `orange-400` (dark) | `#F97316` |
| `medio` | `amber-400` / `amber-300` (dark) | `#EAB308` |
| `bajo` | `green-500` / `green-400` (dark) | `#22C55E` |

#### Colores de Roles (Login y Admin)

| Rol | Color | Background |
|---|---|---|
| Estudiante/Comunidad | `#3B82F6` (blue-500) | `bg-blue-50` |
| Operador | `#F97316` (orange-500) | `bg-orange-50` |
| Supervisor | `#10B981` (emerald-500) | `bg-green-50` |
| Admin | `#8B5CF6` (violet-500) | `bg-purple-50` |

### 9.2 Tipografía Aplicada

**Observado:** No se declaran fuentes custom (`fonts.css` está vacío). Se usa la fuente del sistema por defecto.

#### Escala tipográfica observada en las páginas

| Clase Tailwind | Tamaño aprox. | Uso típico |
|---|---|---|
| `text-3xl` | 30px | Reloj del operador |
| `text-2xl` | 24px | Valores destacados en timer |
| `text-xl` | 20px | Stats principales, valores KPI grandes |
| `text-lg` | 18px | Títulos de sección (h2) |
| `text-base` | 16px | Botones primarios, labels |
| `text-sm` | 14px | Títulos de cards, subtítulos, texto de tabla |
| `text-xs` | 12px | Texto principal de body en interfaces móviles, labels de información |
| `text-[11px]` | 11px | Texto secundario de notificaciones, mensajes |
| `text-[10px]` | 10px | Labels de tabs, metadata, badges de estado |
| `text-[9px]` | 9px | Badges de estado compactos, labels mini |

**Observación:** Las interfaces PWA y Operador usan predominantemente `text-xs` (12px) como tamaño base de body, lo que resulta en texto significativamente más pequeño que el estándar web (16px). Esto es intencional para simular la densidad de una app nativa en el frame reducido de 430px.

#### Pesos tipográficos observados

| Peso | Clase | Uso |
|---|---|---|
| 400 | `font-normal` | Texto de párrafo, descripciones |
| 500 | `font-medium` | Labels, textos intermedios |
| 600 | `font-semibold` | Títulos de cards, nombres, valores |
| 700 | `font-bold` | Encabezados de sección, valores KPI, botones primarios |

### 9.3 Espaciado

#### Padding de contenedores

| Contexto | Padding horizontal | Evidencia |
|---|---|---|
| PWA contenido | `px-4` (16px) | Todas las páginas PWA |
| Operador contenido | `px-4` (16px) | Todas las páginas Operador |
| Web sidebar | — | Ancho fijo |
| Web contenido | `p-6` (24px) | WebLayout outlet wrapper |
| PWA header | `px-4` (16px) | PWALayout |
| Cards internas | `p-3` a `p-6` | Variable según densidad |

#### Espaciado entre elementos

| Patrón | Clase | Valor |
|---|---|---|
| Secciones principales | `space-y-4` | 16px |
| Items de lista | `space-y-2` | 8px |
| Elementos de grid | `gap-2` a `gap-3` | 8px–12px |
| Separación de headers | `mb-2` a `mb-3` | 8px–12px |

### 9.4 Bordes y Radios Aplicados

| Patrón | Clase | Uso |
|---|---|---|
| Cards principales | `rounded-2xl` | Contenedores, cards, inputs de operador |
| Botones | `rounded-xl` a `rounded-2xl` | CTAs, pills, filtros |
| Badges/Pills | `rounded-full` | Badges de estado, dots |
| Hero sections | `rounded-3xl` | Banners grandes, modales bottomsheet |
| Íconos contenidos | `rounded-xl` | Wrappers de íconos |
| Inputs (Web) | `rounded-md` | shadcn button default |

### 9.5 Sombras

| Patrón | Clase | Uso |
|---|---|---|
| Cards estándar | `shadow-sm` | Cards de información |
| Frame phone | `shadow-2xl` | Bordes del frame PWA y Operador |
| CTAs prominentes | `shadow-lg shadow-blue-200` | Botones primarios de acción |
| Botón SOS | `shadow-lg shadow-red-200` | Botón de emergencia |
| Alertas | `shadow-md` | Banners de alerta |

---

## 10. Patrones de Interacción y UX

### 10.1 Patrones de Feedback Visual

| Patrón | Implementación | Ubicación |
|---|---|---|
| Pulsación de indicador | `animate-pulse` (CSS) | Dots de incidentes críticos, indicador "EN SERVICIO", SOS |
| Pulsación radiante SVG | `<animate>` SVG (r + opacity) | Marcadores críticos en mapa, posición actual en mapa |
| Press feedback | `active:scale-[0.97]` / `active:scale-[0.98]` | Cards clickeables en Operador y PWA |
| Hover en sidebar | `hover:bg-white/10` | Items de navegación Web |
| Transición de colores | `transition-colors` / `transition-all` | Botones, links, filtros |
| Loading simulado | Spinner de 1.5s (`setTimeout`) | Login, reporte |
| Confetti | `canvas-confetti` (dependencia) | **Indeterminado** — dependencia presente pero no se observó uso |

### 10.2 Patrones de Filtrado

| Interfaz | Filtros observados |
|---|---|
| WebDashboard | Temporal (hoy/semana/mes) |
| WebCasos | Texto, severidad, estado |
| WebKPIs | Fecha rango, severidad, zona |
| WebAdmin (Usuarios) | Texto de búsqueda |
| WebWhatsApp | Texto, estado (todas/esperando/agente/bot) |
| OperadorIncidentes | Texto, estado, "Mis casos" toggle |
| OperadorMapa | Capa de severidad |
| PWALostFound | Tipo, categoría, texto |

**Patrón común de filtros chip:**
- Scroll horizontal con `overflow-x-auto`.
- Chip activo: fondo primario con texto blanco.
- Chip inactivo: fondo neutro con borde.

### 10.3 Patrones de Listas y Tablas

| Patrón | Interfaces |
|---|---|
| **Card list con borde izquierdo de severidad** | OperadorDashboard, OperadorIncidentes, WebCasos (kanban), PWAMisCasos |
| **Tabla HTML con headers fijos** | WebDashboard, WebCasos (vista tabla), WebAdmin |
| **Grid de stats** | PWAPerfil (3 col), OperadorPerfil (4 col), OperadorDashboard (3 col), WebDashboard (3×2 col) |
| **Lista con dot indicador** | PWAMisCasos, OperadorPerfil (actividad) |

### 10.4 Patrones de Formularios

| Elemento | Estilo común (light) | Estilo común (dark — Operador) |
|---|---|---|
| Input | `border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 focus:outline-none focus:border-[#001C55]` | `bg-[#161b22] border border-gray-800 rounded-2xl text-white focus:border-orange-500` |
| Select | `appearance-none border rounded-2xl px-4 py-3 text-sm bg-gray-50` | Similar dark |
| Textarea | `border rounded-xl px-3 py-2 text-xs resize-none` | `bg-[#161b22] border-gray-700 rounded-2xl text-white` |
| Label | `text-xs font-semibold text-gray-600 mb-1.5 block` | `text-gray-500 text-[9px] font-bold uppercase` |
| Botón primario | `bg-[#001C55] text-white rounded-xl text-xs font-semibold` | `bg-orange-500 text-white rounded-2xl font-bold` |
| Botón secundario | `border border-gray-200 text-gray-600 rounded-xl` | `border border-gray-700 text-gray-300 rounded-2xl` |
| Botón destructivo | `bg-red-600 text-white rounded-2xl font-bold` | `bg-red-600 text-white rounded-2xl font-bold` |
| Botón deshabilitado | `bg-gray-200 text-gray-400 cursor-not-allowed` | — |

### 10.5 Modales y Overlays

| Tipo | Implementación | Ejemplo |
|---|---|---|
| Modal centrado | `fixed inset-0 bg-black/50 flex items-center justify-center` | WebCasos (asignar), WebAdmin (nuevo usuario) |
| Bottomsheet (Operador) | `fixed inset-0 bg-black/80 flex items-end justify-center` | OperadorDashboard (SOS confirmation) |
| Panel lateral | Div condicional dentro del layout columnar | WebCasos (detalle), WebWhatsApp (info) |

### 10.6 Estados Vacíos

**Observado:** Patrón consistente con emoji grande (3xl–4xl) + texto de título + texto descriptivo alineados al centro.
- Ejemplo PWA: "🔍" + "No tienes casos registrados" + sugerencia.
- Ejemplo Operador: "📭" + "Sin incidentes" + "Prueba con otros filtros".

---

## 11. Estrategia Responsiva y Adaptativa

### 11.1 Enfoque General

**Observado:** SafeCampus **no** utiliza un diseño responsivo convencional (un layout que se adapta a distintos anchos). En su lugar, implementa **tres interfaces fijas** con anchos predeterminados:

| Interfaz | Estrategia | Ancho |
|---|---|---|
| PWA | Frame fijo centrado | `max-w-[430px]` |
| Operador | Frame fijo centrado | `max-w-[430px]` |
| Web | Fullscreen con sidebar | Sin límite (fluid) |

### 11.2 Web Operativa — Responsividad Limitada

**Observado en `WebLayout.tsx`:**
- El sidebar se colapsa a un overlay (hamburger menu) en *mobile*, detectado implícitamente.
- El contenido no tiene media queries explícitas más allá del toggle del sidebar.
- Las páginas Web usan grids CSS (`grid-cols-3`, `grid-cols-6`) que no definen breakpoints responsivos (`md:`, `lg:`).

**Inferido:** En viewports menores a ~768px, los grids de 3+ columnas podrían comprimir el contenido. Sin embargo, la interfaz Web está diseñada para uso en desktop/tablet.

### 11.3 Hook `useIsMobile()`

**Observado** en `src/app/components/ui/use-mobile.ts`:
- Breakpoint: `768px`.
- Utilizado por el componente `sidebar.tsx` de shadcn/ui.
- **No se encontró uso directo en las páginas** — solo se consume internamente en el sidebar component.

### 11.4 PWA y Operador — Sin Responsividad

**Observado:** Las interfaces PWA y Operador están diseñadas para un ancho fijo de 430px y **no se adaptan al viewport**. En pantallas de escritorio, el frame se centra con `flex items-start justify-center` y el espacio restante es fondo gris. No hay breakpoints que modifiquen el layout.

**Inferido:** Este es un enfoque deliberado de prototipado: simular la experiencia de una app nativa dentro del navegador. No es una PWA real (no hay `manifest.json`, service worker, ni meta tags de viewport configurados para mobile).

---

## 12. Accesibilidad

### 12.1 Accesibilidad en Componentes shadcn/ui (Radix)

**Observado:** Los componentes en `components/ui/` basados en Radix UI incluyen de fábrica:
- Estados `focus-visible` con `ring` y estilos de foco.
- Atributos `aria-invalid` con estilos visuales correspondientes.
- `data-slot` para identificación semántica.
- Soporte de `disabled` con `pointer-events-none` y `opacity-50`.
- Manejo de teclado (parte de las primitivas Radix: Dialog, DropdownMenu, etc.).

### 12.2 Accesibilidad en Páginas

**Observado — Deficiencias:**

| Aspecto | Estado | Evidencia |
|---|---|---|
| Atributos `alt` en imágenes | Parcial | `ImageWithFallback` preserva `alt`, pero los SVG inline no tienen `aria-label` ni `<title>` |
| Roles ARIA en regiones | **Ausente** | Ninguna página usa `role="main"`, `role="navigation"`, `aria-label` en landmarks |
| Skip navigation | **Ausente** | No existe enlace "Skip to main content" |
| Contraste de color | **Preocupante** | Textos `text-[10px] text-gray-400` sobre fondo blanco  ≈ relación ~2.5:1 (falla WCAG AA para texto normal). Textos `text-gray-600` sobre `#0d1117` también presentan riesgo. |
| Focus en botones custom | **Ausente** | Los botones construidos con `<button className="...">` en páginas no tienen estilos de `focus:` ni `focus-visible:` declarados |
| Texto alternativo en mapas SVG | **Ausente** | Los mapas SVG son puramente visuales sin alternativa textual |
| Semántica HTML | Parcial | Se usan `<h2>` para títulos de sección, pero la jerarquía no siempre es correcta (saltos de h2 a spans) |
| Labels en formularios | **Ausente** | Los inputs usan labels visuales (`<div>` o `<label>`) pero sin `htmlFor`/`id` vinculados en la mayoría de casos |

### 12.3 Tamaños de Target Táctil

**Observado:** Los tabs de navegación inferior tienen `py-2.5` con tamaño de ícono `w-5 h-5`, resultando en un target vertical de ~36px. **La recomendación mínima es 44×44px (WCAG) / 48×48dp (Material Design)**. Los filtros chip tienen `py-1.5` (~28–30px de alto), por debajo del mínimo recomendado.

---

## 13. Consistencia entre Plataformas

### 13.1 Elementos Consistentes

| Elemento | PWA | Web | Operador | Consistente |
|---|---|---|---|---|
| Color primario de marca | `#001C55` | `#001C55` | `#001C55` (en timer SVG) | ✅ Parcial |
| Severidad: colores | red/orange/amber/green | red/orange/amber/green | red/orange/amber/green | ✅ Sí |
| Severidad: labels | critico/alto/medio/bajo | critico/alto/medio/bajo | CRITICO/ALTO/MEDIO/BAJO | ✅ Lógica consistente |
| Status: colores | blue/amber/orange/green/gray | blue/amber/orange/green/gray | blue/amber/orange/green/gray | ✅ Sí |
| Status: labels | Variables | Variables | NUEVO/EN ATENCIÓN/etc. | ⚠️ Casing varía |
| Íconos | lucide-react | lucide-react | lucide-react | ✅ Sí |
| Border radius estándar | `rounded-2xl` | Mixto (`rounded-lg`, `rounded-xl`) | `rounded-2xl` | ⚠️ Parcial |
| Mapa SVG del campus | `PWAReportar` (simple) | `WebDashboard` (detallado) | `OperadorMapa` (detallado dark) | ⚠️ 3 implementaciones distintas |
| Datos mock | `mockData.ts` compartido | `mockData.ts` compartido | `mockData.ts` compartido | ✅ Sí |

### 13.2 Inconsistencias Identificadas

| Aspecto | Detalle |
|---|---|
| **Tokens vs. hardcoded** | Los tokens CSS de `theme.css` (ej. `--primary: #030213`) no coinciden con el color primario usado en las páginas (`#001C55`). Las páginas usan colores hardcoded en lugar de tokens semánticos. |
| **Dark mode** | El Operador tiene un dark theme completamente custom con colores inline (`#0d1117`, `#161b22`), sin relación con los tokens `.dark` de `theme.css`. |
| **Mapas SVG** | Existen 3 implementaciones de mapa del campus (PWAReportar, WebDashboard, OperadorMapa), cada una con diferente nivel de detalle, escala, y nombres de edificios. No hay componente compartido. |
| **Configuración de severidad** | Cada página redefine su propio `severityConfig` / `severityColor` como constante local en lugar de importar una configuración centralizada. Ejemplo: `OperadorDashboard.tsx`, `OperadorIncidentes.tsx`, `OperadorMapa.tsx`, `WebDashboard.tsx`, `WebCasos.tsx` — cada uno con su propio mapping. |
| **Status labels** | Las etiquetas de estado se definen como constantes locales (`statusLabel`) en cada página que las necesita, con variaciones de formato (mayúsculas en Operador, mixed case en PWA). |
| **Cards pattern** | PWA: `bg-white rounded-2xl border border-gray-100 shadow-sm`. Web: `bg-white rounded-lg shadow-sm border` (variable). Operador: `bg-[#161b22] rounded-2xl border border-gray-800`. No hay componente Card compartido pese a existir `card.tsx`. |
| **Componentes shadcn/ui no usados** | ~35 componentes instalados pero las páginas replican los patrones manualmente. |

---

## 14. Gestión del Estado y Datos

### 14.1 Estado Local

**Observado:** Todo el estado de la aplicación es local (`useState`). No hay:
- ❌ Estado global (no React Context para datos, no Redux, no Zustand).
- ❌ Llamadas a API ni fetching de datos.
- ❌ Autenticación real ni gestión de sesión.
- ❌ Persistencia de datos (no localStorage, no cookies para datos de usuario — solo la cookie de sidebar).
- ❌ Comunicación entre páginas más allá de compartir `mockData.ts`.

### 14.2 Datos Mock

**Observado** en `src/app/data/mockData.ts`:

| Entidad | Tipo TypeScript | Registros Mock |
|---|---|---|
| `User` | `UserRole`, campos de identificación | 10 usuarios |
| `Incident` | `IncidentSeverity`, `IncidentStatus`, `IncidentType`, coords x/y | 7 incidentes |
| `LostFoundItem` | tipo, categoría, estado | 5 items |
| `KPIData` | label, value, trend | 6 KPIs |
| Datos de gráficos | Arrays para recharts | `chartEvolution`, `chartByType`, `chartByZone` |
| `SLAData` | label, value, threshold | 4 indicadores |
| Integraciones | nombre, estado, endpoint | 4 sistemas |
| Notificaciones | title, body, type, read | 4 notificaciones |
| Audit Log | action, user, detail, timestamp | 5 registros |
| Permisos | matriz por rol | 7 permisos × 4 roles |
| `WhatsAppConversation` | mensajes, usuario, estado, asignado | 6 conversaciones |

### 14.3 Tipos TypeScript

**Observado:** Los tipos están bien definidos con uniones literales (`type ... = 'a' | 'b' | 'c'`) para valores enumerados:
- `UserRole`: `'comunidad' | 'operador' | 'supervisor' | 'admin'`
- `IncidentSeverity`: `'critico' | 'alto' | 'medio' | 'bajo'`
- `IncidentStatus`: `'nuevo' | 'en_atencion' | 'pendiente' | 'resuelto' | 'cerrado'`
- `IncidentType`: 8 tipos de incidente

**Inferido:** El sistema de tipos actúa como contrato de datos para un futuro backend.

---

## 15. Iconografía y Recursos Gráficos

### 15.1 Biblioteca de Íconos

**Observado:** Se utiliza exclusivamente `lucide-react` (v0.487.0) como biblioteca de íconos. Los íconos se importan individualmente por nombre.

#### Íconos más frecuentes por interfaz

| Interfaz | Íconos frecuentes |
|---|---|
| **PWA** | `Shield`, `MapPin`, `AlertTriangle`, `CheckCircle`, `FileText`, `Navigation`, `ShieldCheck`, `Clock`, `Search`, `Camera`, `Plus`, `Info` |
| **Web** | `LayoutDashboard`, `FileText`, `BarChart3`, `MessageCircle`, `Settings`, `Bell`, `ChevronDown`, `TrendingUp`, `TrendingDown`, `Download`, `Users`, `Activity`, `Eye`, `Edit`, `Trash2` |
| **Operador** | `Shield`, `RadioTower`, `AlertTriangle`, `Clock`, `CheckCircle`, `MapPin`, `ChevronRight`, `Zap`, `Megaphone`, `Radio`, `Search`, `Filter`, `Camera`, `X`, `ArrowUpCircle` |
| **Login** | `Shield`, `Radio`, `MapPin`, `BarChart3`, `Eye`, `EyeOff`, `Mail`, `Lock`, `ChevronRight` |

### 15.2 Tamaño Estándar de Íconos

| Contexto | Tamaño | Ejemplo |
|---|---|---|
| Navegación bottom tab | `w-5 h-5` | 20px |
| Inline con texto | `w-3 h-3` a `w-4 h-4` | 12–16px |
| Hero / CTA grande | `w-10 h-10` a `w-14 h-14` | 40–56px |
| Contenedor de ícono | `w-8 h-8` wrapper, `w-4 h-4` ícono | 32px wrapper, 16px ícono |
| Stats / KPI | `w-5 h-5` a `w-6 h-6` | 20–24px |

### 15.3 Recursos SVG Inline

**Observado:** Los mapas del campus son SVG inline (no archivos externos):
- `PWAReportar.tsx`: Mapa simplificado ~10 edificios, esquema claro.
- `WebDashboard.tsx`: Mapa detallado ~12 edificios, colores variados, animaciones CSS.
- `OperadorMapa.tsx`: Mapa detallado dark ~10 edificios, grid pattern dark, animaciones SVG para posición y marcadores.

Otros SVG inline: barra de estado simulada (señal, batería, WiFi), timer circular en `PWAAcompanamiento`.

### 15.4 Imágenes y Multimedia

**Observado:** No se utilizan imágenes rasterizadas (PNG, JPG, WebP) en ninguna página. Todo el contenido visual es generado via:
- Íconos `lucide-react`.
- SVG inline para mapas y gráficos.
- Emojis Unicode para íconos decorativos en cards.
- Avatares con iniciales de texto sobre fondo coloreado.
- `recharts` para gráficos de datos.

### 15.5 Emojis como Íconos

**Observado:** Se usan emojis Unicode como íconos decorativos en cards de categoría:
- `PWAReportar`: 🚨, 🚗, 🔥, 👊, 🏥, 💥, 👤 (tipos de incidente).
- `PWAHome`: 📋, 🔍, 📦, 🛡️ (acciones rápidas), 💡, 📱, 👥 (tips).
- `PWAAcompanamiento`: 📍, ⏱️, 🆘, 🛡️ (features).
- `PWAMisCasos`: 🔍 (empty state).
- `OperadorIncidentes`: 📭 (empty state).

---

## 16. Oportunidades de Mejora Identificadas

### 16.1 Sistema de Diseño

| # | Mejora | Impacto | Complejidad |
|---|---|---|---|
| 1 | **Utilizar tokens CSS en lugar de colores hardcoded** — Reemplazar `#001C55`, `#0d1117`, etc. por variables CSS (`var(--primary)`, `var(--operador-surface)`, etc.) | Alto — consistencia, mantenimiento, dark mode real | Media |
| 2 | **Integrar componentes shadcn/ui en las páginas** — Reemplazar badges, botones, cards, inputs inline por componentes reutilizables | Alto — consistencia, mantenimiento, accesibilidad | Media |
| 3 | **Centralizar configuraciones de severidad/estado** — Mover `severityConfig`, `statusLabel`, `statusBadgeColor` a un archivo compartido | Medio — elimina duplicación en ~8 archivos | Baja |
| 4 | **Crear componente de mapa reutilizable** — Unificar las 3 implementaciones SVG del campus | Medio — consistencia visual, mantenimiento | Alta |
| 5 | **Alinear radios de borde con tokens** — Los tokens definen `--radius-xl` como 14px pero los componentes usan `rounded-2xl` (~16px) | Bajo — coherencia del sistema | Baja |

### 16.2 Accesibilidad

| # | Mejora | Estándar |
|---|---|---|
| 6 | **Añadir `aria-label` a regiones de navegación** | WCAG 2.1 — 1.3.1 |
| 7 | **Vincular labels con inputs (`htmlFor`/`id`)** | WCAG 2.1 — 1.3.1 |
| 8 | **Implementar skip navigation** | WCAG 2.1 — 2.4.1 |
| 9 | **Mejorar contraste de textos pequeños** — `text-gray-400` en fondo blanco falla WCAG AA | WCAG 2.1 — 1.4.3 |
| 10 | **Aumentar tamaños de target táctil** a ≥44px | WCAG 2.1 — 2.5.5 |
| 11 | **Añadir `<title>` y `aria-label` a SVGs de mapa** | WCAG 2.1 — 1.1.1 |
| 12 | **Añadir estilos `focus-visible` a botones custom** | WCAG 2.1 — 2.4.7 |

### 16.3 Arquitectura

| # | Mejora | Detalle |
|---|---|---|
| 13 | **Evaluar la dependencia MUI** — Instalada pero no utilizada; incrementa el bundle size innecesariamente | Remover `@mui/material` y `@emotion/*` si no se planea usar |
| 14 | **Implementar detalle de incidente como subruta** — Actualmente es estado local, lo que impide deep linking y compartir URLs | Usar rutas como `/operador/incidentes/:id` |
| 15 | **Extraer constantes de tema a archivo centralizado** — Colores de marca, configs de severidad, labels de estado | Crear `src/app/constants/theme.ts` |

### 16.4 Funcionalidades No Implementadas (Solo UI)

**Observado — Botones/acciones sin funcionalidad real:**

| Elemento | Ubicación | Estado |
|---|---|---|
| Exportar CSV/PDF | WebKPIs | Solo UI, sin generación de archivos |
| Drag & drop Kanban | WebCasos | Vista visual sin `react-dnd` implementado |
| Subir foto | PWAReportar, OperadorIncidentes | Placeholder visual, sin input file real |
| Buscar/filtrar avanzado | Varios | Filtros locales sobre mock data |
| Asignar operador | WebCasos, OperadorIncidentes | Modal incompleto o sin lógica de guardado |
| Tomar conversación WhatsApp | WebWhatsApp | Cambia estado local, sin backend |
| Notificaciones push | PWAPerfil | Listado de preferencia sin implementación |
| SSO institucional | Login | Simulado con `setTimeout` |

---

## 17. Matriz de Trazabilidad: Casos de Uso → Pantallas

**Fuente de casos de uso:** `src/imports/pasted_text/gestion-usuarios-seguridad.md`

| ID Caso de Uso | Nombre | Pantalla(s) que lo implementa(n) | Nivel de implementación |
|---|---|---|---|
| 3.1.1.1 | Iniciar sesión con credenciales institucionales | `Login.tsx` | 🟡 UI completa, autenticación simulada (sin SSO real, sin validación de credenciales) |
| 3.1.1.2 | Gestionar roles y permisos | `WebAdmin.tsx` (tab Roles y Permisos) | 🟡 UI de lectura implementada (matriz de permisos), sin CRUD de permisos real |
| 3.1.1.3 | Visualizar perfil de usuario | `PWAPerfil.tsx`, `OperadorPerfil.tsx` | 🟢 UI completa con datos mock |
| 3.1.1.4 | Consultar usuarios por criterios | `WebAdmin.tsx` (tab Usuarios) | 🟡 Tabla con búsqueda por texto, sin filtros avanzados por rol/estado |
| 3.1.2.1 | Registrar incidente | `PWAReportar.tsx` | 🟡 Wizard completo de 3 pasos con éxito simulado, sin persistencia real |
| 3.1.2.2 | Consultar estado e historial del incidente | `PWAMisCasos.tsx`, `WebCasos.tsx`, `OperadorIncidentes.tsx` | 🟢 UI de lectura con timeline de historial |
| 3.1.2.3 | Clasificar y priorizar incidente (IA) | — | 🔴 No implementado en el frontend |
| 3.1.2.4 | Gestionar incidente por operador | `OperadorIncidentes.tsx`, `OperadorDashboard.tsx` | 🟡 UI de gestión (notas, acciones), sin persistencia |
| 3.1.2.5 | Cerrar incidente | `WebCasos.tsx` (acción Cerrar), `OperadorIncidentes.tsx` (Marcar resuelto) | 🟡 Botones presentes, sin lógica de cierre real |
| 3.1.2.6 | Notificar eventos del incidente | `PWAPerfil.tsx` (lista de notificaciones) | 🟡 Lectura de mock notifications, sin push real |
| 3.1.3.1 | Visualizar dashboard georreferenciado | `WebDashboard.tsx`, `OperadorMapa.tsx` | 🟢 SVG interactivo con filtros y marcadores |
| 3.1.3.2 | Consultar KPIs operativos | `WebKPIs.tsx` | 🟢 Gráficos recharts, SLA, cards de métricas |
| 3.1.3.3 | Exportar reportes de incidentes | `WebKPIs.tsx` (sección exportar) | 🟡 UI de filtros y botones CSV/PDF, sin generación real |
| 3.1.3.4 | Monitorear integraciones y servicios | `WebAdmin.tsx` (tab Integraciones) | 🟢 Cards de estado de 4 integraciones |
| 3.1.4.1 | Registrar caso de Lost & Found | `PWALostFound.tsx` (formulario) | 🟡 Formulario completo, sin persistencia |
| 3.1.4.2 | Buscar y dar seguimiento a objetos | `PWALostFound.tsx` (búsqueda/filtros) | 🟢 Filtros de tipo, categoría, texto sobre mock data |
| 3.1.4.3 | Cerrar caso de Lost & Found | — | 🔴 No implementado en el frontend |
| 3.1.4.4 | Iniciar acompañamiento seguro | `PWAAcompanamiento.tsx` | 🟢 Flujo completo: config → activo → alerta |
| 3.1.4.5 | Emitir alerta durante acompañamiento | `PWAAcompanamiento.tsx` (estado `alerta`) | 🟡 UI de alerta con timer expiry, SOS button, sin notificación real a backend |

**Leyenda:**
- 🟢 **UI implementada completamente** — Pantalla funcional con todas las secciones visuales del caso de uso.
- 🟡 **UI parcialmente implementada** — Pantalla existe pero falta funcionalidad real (persistencia, API calls, lógica de negocio).
- 🔴 **No implementado** — No existe pantalla ni componente que cubra este caso de uso.

---

## Anexo A: Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Acceder a la aplicación
# http://localhost:5173/
```

## Anexo B: Resumen de Dependencias No Utilizadas (Observado)

| Dependencia | Razón de sospecha |
|---|---|
| `@mui/material` / `@emotion/react` / `@emotion/styled` | No se encontró ningún import de MUI en archivos de páginas |
| `react-dnd` / `react-dnd-html5-backend` | Dependencia instalada, vista Kanban presente pero sin drag & drop funcional |
| `motion` (Framer Motion) | No se encontró `<motion.div>` ni imports de `motion` en páginas |
| `canvas-confetti` | No se encontró import ni uso en páginas |
| `react-hook-form` | Solo envuelto en `form.tsx` de shadcn — no usado en páginas |
| `cmdk` | Solo envuelto en `command.tsx` de shadcn — no usado en páginas |

---

*Documento generado a partir del análisis estático exhaustivo del código fuente del repositorio SafeCampus-PUCP. Todas las afirmaciones están basadas en evidencia directa del código (observadas), inferencias lógicas (inferidas) o ausencias verificadas (indeterminadas/no implementadas).*
