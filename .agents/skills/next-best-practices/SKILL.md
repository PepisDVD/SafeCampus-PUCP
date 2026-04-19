---
name: next-best-practices
description: Next.js 16 App Router conventions for production pages and auth flows.
---

# Skill: Next Best Practices

Use this skill for `apps/web` routes, layouts, middleware/proxy, and data fetching.

## Goals
- Server Components by default.
- Client Components only when interactivity is required.
- Keep auth/session refresh in edge proxy.

## SafeCampus Checklist
- Place routes in `apps/web/src/app/...` using route groups.
- Prefer rendering from `@safecampus/ui-kit` shared components.
- Keep app-specific variants in `apps/web/src/components`.
- For Supabase auth flow:
  - Use shared client helpers from `@safecampus/data`.
  - Keep `proxy.ts` using session refresh logic.
- Validate required env vars in `apps/web/.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Rules
- Do not duplicate shared UI primitives inside `apps/web/src/components/ui`.
- Do not move auth logic into random route files; centralize in proxy and data layer.
