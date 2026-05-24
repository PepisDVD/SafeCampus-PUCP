# packages/ui-native - Agent Rules

## Overview
React Native primitives for SafeCampus mobile experiences.

## Rules
- Keep components platform-safe for Expo and React Native.
- Do not import web-only packages such as Next.js, Radix, DOM APIs, or `lucide-react`.
- Keep styles based on exported tokens in `src/theme.ts`.
- Components must be typed, small, and usable from `apps/mobile`.
- Required scripts: `build`, `lint`, `test`, `typecheck`.
