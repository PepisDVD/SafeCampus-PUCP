---
name: vercel-react-best-practices
description: React 19 server/client boundary, hydration, and rendering performance.
---

# Skill: React Best Practices

Use this skill for React 19 patterns in web and shared UI packages.

## Goals
- Clear server/client boundaries.
- Stable rendering and hydration behavior.
- Reusable, typed component APIs.

## SafeCampus Checklist
- Keep heavy data loading in Server Components when possible.
- Mark Client Components explicitly with `"use client"` only when needed.
- Expose typed props from `packages/ui-kit`.
- Keep browser-only APIs out of Server Components.

## Rules
- Do not promote entire trees to Client Components for convenience.
- Do not hide network or auth side effects inside visual components.
