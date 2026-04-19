# apps/web — Agent Rules

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Overview
Next.js 16 web application for SafeCampus PUCP — serves both the community PWA and the operativo dashboard.

## Stack
- **Framework**: Next.js 16 (App Router)
- **React**: 19.2 (Server Components by default)
- **Styling**: Tailwind CSS v4 (CSS-first config via `@theme`)
- **Components**: shadcn/ui from `@safecampus/ui-kit`
- **State**: React Hook Form + Zod
- **Testing**: Vitest (unit) + Playwright (E2E)

## Commands
```bash
pnpm dev              # next dev
pnpm build            # next build
pnpm lint             # eslint
pnpm test             # vitest run
pnpm test:watch       # vitest
pnpm test:coverage    # vitest --coverage
pnpm test:e2e         # playwright test
```

## Structure
```
src/
├── app/              # Next.js App Router (route groups)
│   ├── (admin)/      # Admin pages
│   ├── (auth)/       # Login
│   ├── (comunidad)/  # Community PWA pages
│   └── (operativo)/  # Supervisor/operator dashboard
├── components/       # App-specific components (layout, charts, forms, maps)
├── constants/        # Static config, roles, routes
├── features/         # Feature modules (incidentes, auth, lost-found, etc.)
├── hooks/            # App-level hooks
├── lib/              # API client, auth, utils
├── styles/           # tokens.css (design tokens)
└── types/            # App-level types
```

## Conventions
- Import shared UI from `@safecampus/ui-kit`
- Import shared types from `@safecampus/shared-types`
- Path alias: `@/*` → `./src/*`
- Use `"use client"` only when necessary (events, hooks, browser APIs)
- Design tokens from `@safecampus/config/tailwind/theme.css` (imported in globals.css)

## Anti-patterns
- **Never** duplicate shadcn components in `src/components/ui/` — they live in `@safecampus/ui-kit`
- **Never** install tailwind plugins here — config lives in `@safecampus/config`
- **Never** use `pages/` directory — App Router only
- **Never** use `getServerSideProps` / `getStaticProps` — use Server Components or `fetch` in RSC
- **Never** hardcode API base URL — use `NEXT_PUBLIC_API_URL`
