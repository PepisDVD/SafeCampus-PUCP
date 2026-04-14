# 🎨 Design Tokens — SafeCampus PUCP

> Tokens extraídos de la referencia Figma: `repo-safeCampus-UI-Base-Figma/src/styles/theme.css`

## Fuente

| Archivo fuente | Descripción |
|---|---|
| `theme.css` | Variables CSS `:root` y `.dark`, `@theme inline`, `@layer base` |
| `fonts.css` | (vacío en referencia) |
| `tailwind.css` | Importa Tailwind CSS + tw-animate-css |
| `index.css` | Barrel de imports + estilos de impresión |

## Tokens extraídos

### Colores principales

| Token | Light | Dark |
|---|---|---|
| `--background` | `#ffffff` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | `#030213` | `oklch(0.985 0 0)` |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--secondary` | `oklch(0.95 0.0058 264.53)` | `oklch(0.269 0 0)` |
| `--muted` | `#ececf0` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `#717182` | `oklch(0.708 0 0)` |
| `--accent` | `#e9ebef` | `oklch(0.269 0 0)` |
| `--destructive` | `#d4183d` | `oklch(0.396 0.141 25.723)` |
| `--border` | `rgba(0,0,0,0.1)` | `oklch(0.269 0 0)` |

### Inputs y controles

| Token | Light |
|---|---|
| `--input` | `transparent` |
| `--input-background` | `#f3f3f5` |
| `--switch-background` | `#cbced4` |

### Border Radius

| Token | Valor |
|---|---|
| `--radius` | `0.625rem` |
| `--radius-sm` (derivado) | `calc(var(--radius) - 4px)` |
| `--radius-md` (derivado) | `calc(var(--radius) - 2px)` |
| `--radius-lg` (derivado) | `var(--radius)` |
| `--radius-xl` (derivado) | `calc(var(--radius) + 4px)` |

### Tipografía

| Token | Valor |
|---|---|
| `--font-size` | `16px` |
| `--font-weight-medium` | `500` |
| `--font-weight-normal` | `400` |

#### Escala tipográfica (de `@layer base`)

| Elemento | Tamaño Tailwind | Peso |
|---|---|---|
| `h1` | `text-2xl` | `font-weight: var(--font-weight-medium)` |
| `h2` | `text-xl` | `font-weight: var(--font-weight-medium)` |
| `h3` | `text-lg` | `font-weight: var(--font-weight-medium)` |
| `h4` | `text-base` | `font-weight: var(--font-weight-medium)` |
| `p` | (default) | (default) |
| `label`, `button` | `text-base` | `font-weight: var(--font-weight-medium)` |
| `input` | `text-base` | `font-weight: var(--font-weight-normal)` |

### Chart Colors

| Token | Light | Dark |
|---|---|---|
| `--chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` |
| `--chart-2` | `oklch(0.6 0.118 184.704)` | `oklch(0.696 0.17 162.48)` |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)` |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)` |
| `--chart-5` | `oklch(0.769 0.188 70.08)` | `oklch(0.645 0.246 16.439)` |

### Sidebar

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-primary` | `#030213` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` |

## Uso en el proyecto

Los tokens se importan en `apps/web/src/styles/tokens.css` y se aplican mediante las utilidades de Tailwind CSS 4 (`@theme inline` en el archivo de tema).

```css
/* Ejemplo de uso */
.mi-componente {
  background-color: var(--background);
  color: var(--foreground);
  border-radius: var(--radius);
}
```

En Tailwind CSS 4 se accede automáticamente:

```html
<div class="bg-background text-foreground rounded-lg">...</div>
```
