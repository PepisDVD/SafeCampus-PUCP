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
- Before creating or copying any UI component:
  - Search `packages/ui-kit/src/components/ui` and the `@safecampus/ui-kit` barrel export first.
  - Prefer existing shadcn/ui primitives from `@safecampus/ui-kit` for buttons, cards, tables, dialogs, drawers, tooltips, inputs, selects, badges, tabs, pagination, skeletons, and similar UI.
  - Compose feature UI from those primitives in `apps/web`; only add a new shared primitive to `packages/ui-kit` when no suitable component exists and the need is reusable.
- Shared components:
  - Create/update in `packages/ui-kit/src/components`.
- App-specific components:
  - Keep in `apps/web/src/components`.
- Tokens and theme:
  - Keep shared theme in `packages/config`.
- Verify imports in web pages come from `@safecampus/ui-kit` when component is reusable.

## Rules
- Do not recreate shadcn/ui primitives inside frontend feature folders. Import them from `@safecampus/ui-kit`.
- Do not copy old Figma base components directly into app routes.
- Do not create competing style systems per app.
