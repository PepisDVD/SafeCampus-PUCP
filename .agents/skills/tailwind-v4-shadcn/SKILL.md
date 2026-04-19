---
name: tailwind-v4-shadcn
description: Tailwind CSS v4 and shadcn conventions using shared ui-kit components.
---

# Skill: Tailwind v4 + shadcn

Use this skill when implementing or migrating UI.

## Goals
- `packages/ui-kit` is the single source for shared components.
- Tailwind v4 tokens stay centralized.
- Product pages use validated Figma UI patterns without duplicating primitives.

## SafeCampus Checklist
- Shared components:
  - Create/update in `packages/ui-kit/src/components`.
- App-specific components:
  - Keep in `apps/web/src/components`.
- Tokens and theme:
  - Keep shared theme in `packages/config`.
- Verify imports in web pages come from `@safecampus/ui-kit` when component is reusable.

## Rules
- Do not copy old Figma base components directly into app routes.
- Do not create competing style systems per app.
