# packages/ui-kit — Agent Rules

## Overview
Shared presentational components for SafeCampus PUCP, based on shadcn/ui patterns. Used by `apps/web` and `apps/mobile`.

## Stack
- **Components**: shadcn/ui (Radix primitives + Tailwind CSS v4 + CVA)
- **Utilities**: `cn()` via clsx + tailwind-merge
- **Icons**: lucide-react

## Structure
```
src/
├── components/
│   └── ui/          # shadcn-compatible components (button, card, dialog, etc.)
├── hooks/           # Shared hooks (useIsMobile, etc.)
├── lib/
│   └── utils.ts     # cn() utility
└── styles/          # Shared style partials
```

## Commands
```bash
pnpm lint            # tsc --noEmit
```

## Conventions
- Every component uses `cn()` from `../lib/utils` for class merging
- Components use `data-slot` attributes for styling hooks
- Follow shadcn/ui conventions: function components, no default exports, named exports
- All components are `"use client"` only when they use React hooks or browser APIs
- Design tokens come from `@safecampus/config/tailwind/theme.css` (consumer imports it)

## Anti-patterns
- **Never** import from `apps/` packages
- **Never** add business logic — this is presentation only
- **Never** hardcode colors — use CSS variables from the theme
- **Never** add page-level components — those belong in the consuming app
- **Never** add `next` as a dependency — keep framework-agnostic where possible
