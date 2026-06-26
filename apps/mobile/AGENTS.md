# apps/mobile - Agent Rules

## Overview

React Native + Expo mobile app for SafeCampus PUCP field operators.

## Stack

- Framework: React Native + Expo
- Components: shared native primitives from `@safecampus/ui-native`
- API client: `src/shared/api`
- Runtime config: `src/shared/config/env.ts`

## Commands

```bash
pnpm dev              # expo start
pnpm dev:lan          # expo start --lan
pnpm dev:lan:clear    # expo start --lan --clear
pnpm dev:lan:auto     # detects laptop LAN IP and starts expo --lan --clear
pnpm dev:tunnel       # expo start --tunnel
pnpm dev:tunnel:auto  # detects laptop LAN IP and starts expo --tunnel --clear
pnpm build:android    # eas build --platform android
pnpm build:ios        # eas build --platform ios
pnpm test             # vitest run --passWithNoTests
pnpm typecheck        # tsc --noEmit
```

## Conventions

- TSConfig extends `@safecampus/config/tsconfig/react-native.json`.
- Import domain types from `@safecampus/shared-types`.
- Operator-specific screens and components live here.
- Use `@safecampus/ui-native` for shared presentational components.
- Keep API calls in `src/shared/api` or feature hooks/services, not directly in UI components.
- `API_BASE_URL` resolves in this order:
  1. `EXPO_PUBLIC_API_URL`
  2. Metro LAN IP in dev (`http://<metro-ip>:8000/api/v1`)
  3. `http://localhost:8000/api/v1`
- For physical-device testing with a local backend:
  - start backend with `pnpm dev:backend`
  - verify `http://<laptop-lan-ip>:8000/health` from the phone
  - start mobile with `pnpm dev:lan:auto`

## Testing

- Add Vitest coverage for runtime config, auth/client, fallback, and permission changes.
- Validate scoped changes with:

```bash
pnpm --filter @safecampus/mobile test
pnpm turbo run typecheck --filter=@safecampus/mobile
```

## Anti-patterns

- Never import Next.js or web-specific code.
- Never import `@safecampus/ui-kit`, Radix, DOM APIs, or web-only icons in mobile.
- Never duplicate types already in `@safecampus/shared-types`.
- Never put API client logic directly in UI components.
- Never assume `localhost` reaches the laptop from a physical phone.
