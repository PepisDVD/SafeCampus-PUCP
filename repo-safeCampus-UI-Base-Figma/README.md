# SafeCampus PUCP Frontend

Guia base para levantar, mantener y evolucionar el frontend de SafeCampus PUCP.

Este documento esta pensado como input tecnico para estandarizacion y para que otro agente IA pueda generar un documento formal a partir de una base consistente.

## 1. Objetivo

Definir una base de trabajo comun para el frontend con React + TypeScript, incluyendo:

- Requisitos de entorno.
- Pasos de instalacion y ejecucion.
- Arquitectura actual del proyecto.
- Librerias y componentes de UI disponibles.
- Estandares de programacion y GUI que deben respetarse.
- Checklist minima de calidad antes de integrar cambios.

## 2. Stack Tecnologico

Base del proyecto:

- React 18.3.1
- TypeScript en codigo fuente (`.ts` / `.tsx`)
- Vite 6.3.5
- React Router 7.13.0
- Tailwind CSS 4.1.12
- Radix UI + componentes estilo shadcn/ui en `src/app/components/ui`

Librerias relevantes actualmente instaladas:

- UI y utilidades: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- Formularios y fecha: `react-hook-form`, `date-fns`, `react-day-picker`
- Visualizacion: `recharts`
- Interacciones: `react-dnd`, `embla-carousel-react`, `vaul`, `sonner`, `motion`
- MUI: `@mui/material`, `@emotion/react`, `@emotion/styled` (instaladas, uso actual limitado)

## 3. Requisitos de Entorno

Recomendado para desarrollo local:

- Node.js 20 LTS o superior
- npm 10+
- Git
- VS Code con soporte TypeScript/React

Nota: el repositorio incluye `package-lock.json`, por lo que el flujo por defecto usa npm.

## 4. Instalacion y Ejecucion

Desde la raiz del proyecto:

```bash
npm install
npm run dev
```

Build de produccion:

```bash
npm run build
```

Servidor local (Vite):

- URL esperada: `http://localhost:5173`

## 5. Scripts Disponibles

Scripts actuales en `package.json`:

- `npm run dev`: inicia Vite en desarrollo.
- `npm run build`: genera bundle de produccion.

Observacion: aun no existen scripts de `lint`, `test` y `preview`.

## 6. Arquitectura Funcional Actual

La aplicacion es una SPA con enrutamiento por layout:

- `/`: Login
- `/pwa`: interfaz estudiante/comunidad
- `/web`: interfaz supervisor/admin
- `/operador`: interfaz operador de campo
- `/docs/components`: showcase de componentes

Archivos clave:

- `src/main.tsx`: entrada de la app
- `src/app/App.tsx`: `RouterProvider`
- `src/app/routes.ts`: mapa de rutas
- `src/styles/index.css`: orquesta fuentes, tailwind y tema
- `src/styles/theme.css`: tokens base de diseno

## 7. Estandares de Programacion (React + TypeScript)

### 7.1 Convenciones generales

- Usar componentes funcionales y hooks.
- Evitar logica de negocio compleja dentro del JSX.
- Mantener tipado explicito en modelos, props y estados cuando aplique.
- No introducir `any` salvo casos justificados y encapsulados.

### 7.2 Organizacion por responsabilidades

- `src/app/pages`: paginas por plataforma (`pwa`, `web`, `operador`).
- `src/app/components/ui`: componentes reutilizables base.
- `src/app/data/mockData.ts`: datos mock y tipos compartidos.

### 7.3 Convenciones de nombres

- Componentes y paginas: `PascalCase`.
- Archivos utilitarios y wrappers UI: `kebab-case` segun convencion actual.
- Tipos y modelos: nombres semanticos y descriptivos.

### 7.4 Estado y datos

Estado actual del proyecto:

- Predomina estado local con `useState` y `useEffect`.
- No existe store global.
- No hay integracion backend real aun.

Estandar recomendado para siguientes iteraciones:

- Mantener estado local para UI de alcance acotado.
- Extraer configuraciones duplicadas (severidad, estados, labels) a constantes compartidas.
- Al integrar backend, separar capa de servicios y capa de presentacion.

### 7.5 Ruteo y navegacion

- Definir rutas en un unico archivo (`src/app/routes.ts`).
- Mantener patron `Layout + Outlet` por plataforma.
- Para vistas de detalle, priorizar subrutas (`/modulo/:id`) cuando se requiera deep link o navegacion compartible.

## 8. Estandares GUI (Alineados al Analisis)

Referencia principal: `README_GUI_STANDARDS.md`.

### 8.1 Sistema visual

- Respetar identidad de cada interfaz:
	- PWA/Web: paleta clara basada en azul institucional.
	- Operador: paleta oscura de alto contraste con acento naranja.
- Priorizar tokens de `theme.css` en lugar de colores hardcodeados.
- Mantener consistencia de radios, espaciados y jerarquia tipografica.

### 8.2 Componentes

- Reutilizar componentes de `src/app/components/ui` cuando exista equivalencia.
- Evitar duplicar patrones de botones, badges, cards, inputs y modales manualmente.
- Centralizar patrones repetidos (estado, severidad, badges) en helpers compartidos.

### 8.3 Accesibilidad minima

Todo cambio nuevo debe incluir al menos:

- `label` asociado a inputs (`htmlFor` + `id`).
- Estados de foco visibles (`focus-visible`).
- Contraste suficiente para texto y componentes interactivos.
- `aria-label` en navegaciones e iconos cuando corresponda.
- Targets tactiles adecuados en botones y tabs.

## 9. Librerias y Componentes a Considerar por Dominio

### Navegacion y estructura

- `react-router`

### UI base

- Radix UI (`@radix-ui/*`)
- utilidades de variantes (`class-variance-authority`)
- combinacion de clases (`clsx`, `tailwind-merge`)
- iconografia (`lucide-react`)

### Formularios

- `react-hook-form`

### Graficos y dashboard

- `recharts`

### Interacciones avanzadas

- `react-dnd`
- `motion`
- `embla-carousel-react`
- `sonner`

## 10. Checklist de Calidad Antes de PR

- El proyecto compila y corre con `npm run dev`.
- El build de produccion termina sin errores (`npm run build`).
- No se rompen rutas existentes (`/`, `/pwa`, `/web`, `/operador`, `/docs/components`).
- Se mantiene consistencia visual con el estandar GUI.
- Se evita duplicar configuraciones existentes (status/severidad/colores).
- Se revisa accesibilidad minima de inputs, botones y navegacion.

## 11. Deuda Tecnica Identificada (Prioridad Recomendada)

1. Agregar `tsconfig.json` explicito para formalizar reglas TypeScript del proyecto.
2. Agregar scripts de calidad: `lint`, `test`, `preview`.
3. Migrar estilos hardcodeados a tokens compartidos.
4. Incrementar uso real de componentes reutilizables (`src/app/components/ui`).
5. Evaluar dependencias instaladas sin uso activo para reducir peso.

## 12. Propuesta de Siguientes Pasos para Formalizacion

Para que otro agente IA formalice este documento, se recomienda pedirle:

1. Generar version normativa (MUST/SHOULD/MAY) de los estandares.
2. Incluir politica de versionado y estrategia de ramas.
3. Definir Definition of Done por tipo de cambio (UI, routing, data, accesibilidad).
4. Agregar plantilla de PR y checklist automatizable.
5. Proponer roadmap tecnico por fases (quick wins, mediano plazo, arquitectura objetivo).

