---
name: monorepo-ci-standards
description: Mandatory scripts and CI gates for lint, typecheck, test, and build.
---

# Skill: Monorepo CI Standards

Use this skill when configuring CI workflows or package scripts.

## Goals
- Every package follows the same quality gates.
- CI catches lint, type, test, and build regressions early.

## Required Package Scripts
- `build`
- `lint`
- `test`
- `typecheck`

## SafeCampus CI Baseline
- Install dependencies with `pnpm install --frozen-lockfile`.
- Run:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Rules
- Do not add packages without required scripts.
- Do not skip failing checks without an explicit temporary exception and follow-up issue.
