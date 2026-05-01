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
- For shared navigation components in `packages/ui-kit`, keep them framework-agnostic:
  - Accept injected link/logo components from `apps/web` instead of importing `next/link` or `next/image` directly in shared packages.
- For route groups with module dashboards such as `(admin)` and `(operativo)`, add `loading.tsx` to improve perceived navigation performance.
- Deduplicate `getCurrentUserProfile()` style auth/profile reads per request using React `cache()` when the same request can hit multiple shells/pages.
- Reuse role-aware shells for universal routes like `/perfil` so users do not lose the main application chrome when navigating from shell-owned menus.
- For Supabase auth flow:
  - Use shared client helpers from `@safecampus/data`.
  - Keep `proxy.ts` using session refresh logic.
- Validate required env vars in `apps/web/.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Rules
- Do not duplicate shared UI primitives inside `apps/web/src/components/ui`.
- Do not move auth logic into random route files; centralize in proxy and data layer.
- Do not use raw `<a href>` for in-app shell navigation in `apps/web`; prefer injected `next/link` for client-side transitions and prefetch.
- Do not force `cache: "no-store"` for every server fetch by default; choose cache policy per endpoint and keep volatile/auth-sensitive reads uncached.
