---
name: mobile-operator-app
description: SafeCampus React Native + Expo mobile operator app conventions.
---

# Skill: Mobile Operator App

Use this skill when implementing `apps/mobile` or `packages/ui-native`.

## Goals
- Keep the mobile app focused on security operators.
- Reuse backend REST contracts and shared domain types.
- Keep mobile UI Expo-safe and independent from web-only packages.
- Preserve traceability for incident actions, notes, status changes, alerts, and device notifications.

## Architecture
- App code lives in `apps/mobile/src`.
- Shared native primitives live in `packages/ui-native`.
- Do not import `@safecampus/ui-kit`, Next.js, Radix, DOM APIs, or web-only icons into mobile.
- Use `@safecampus/shared-types` for domain meaning when available.
- Use `apps/mobile/src/shared/api` for HTTP clients and `features/*` for feature hooks/screens.

## Auth
- Support backend JWT through `Authorization: Bearer`.
- Operator email/password login is for pre-established security staff accounts with `password_hash`.
- Institutional login should exchange a Supabase session for a backend mobile JWT before calling protected APIs.
- Never expose service-role credentials in mobile runtime.

## Quality
- Every package must keep `build`, `lint`, `test`, and `typecheck` scripts.
- Validate scoped changes first:
  - `pnpm turbo run typecheck --filter=@safecampus/mobile`
  - `pnpm turbo run typecheck --filter=@safecampus/ui-native`
- Prefer small components and hooks over API calls directly in screens.
