# packages/shared-types — Agent Rules

## Overview
TypeScript types and enums shared across the entire SafeCampus platform (web, mobile, backend schemas).

## Structure
```
src/
├── index.ts               # Barrel export
├── enums.ts               # Domain enums (EstadoIncidente, NivelSeveridad, etc.)
├── incidente.ts           # Incident interface
├── usuario.ts             # User interface
└── database.types.ts      # Auto-generated Supabase types (DO NOT EDIT)
```

## Commands
```bash
pnpm lint                  # tsc --noEmit
```

## Conventions
- All domain enums are the source of truth — backend mirrors them
- `database.types.ts` is auto-generated via `pnpm gen:types` — never edit manually
- Barrel export everything from `index.ts`
- No runtime dependencies — types only

## Anti-patterns
- **Never** edit `database.types.ts` manually — regenerate with `pnpm gen:types`
- **Never** add runtime logic here — this is types-only
- **Never** import from `apps/` packages
- **Never** add framework-specific types (React, Next.js) — those go in the consuming app
