---
name: testing-monorepo
description: Testing pyramid with Vitest, Playwright, and Pytest across packages.
---

# Skill: Testing Monorepo

Use this skill when adding or reviewing tests across SafeCampus packages.

## Goals
- Keep fast feedback at package level.
- Cover critical flows with E2E.
- Enforce backend behavior with Pytest.

## SafeCampus Checklist
- Web and shared UI:
  - `pnpm turbo run test --filter=@safecampus/web`
  - `pnpm turbo run test --filter=@safecampus/ui-kit`
- E2E:
  - `pnpm --filter @safecampus/web test:e2e`
- Backend:
  - `pnpm test:backend`
- Before merge:
  - `pnpm test`

## Rules
- Do not rely on `--passWithNoTests` for critical modules forever.
- Do not merge API changes without at least one backend test covering new behavior.
