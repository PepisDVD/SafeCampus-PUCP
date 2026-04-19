---
name: turborepo
description: Monorepo orchestration, dependency graph, and task pipelines.
---

# Skill: Turborepo

Use this skill when changing workspace scripts, dependencies, or pipeline behavior.

## Goals
- Keep package scripts consistent: `build`, `lint`, `test`, `typecheck`.
- Keep workspace dependencies as `workspace:*`.
- Ensure task graph works with `turbo.json`.

## SafeCampus Checklist
- Update package-level scripts first.
- Validate root scripts in `package.json`.
- Run scoped tasks before full tasks:
  - `pnpm turbo run lint --filter=<package>`
  - `pnpm turbo run typecheck --filter=<package>`
- Run full graph checks before merge:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Rules
- Do not add ad-hoc scripts in one package if the same concern exists repo-wide.
- Do not bypass Turbo with custom per-package CI commands unless justified.
