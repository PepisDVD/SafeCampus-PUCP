# apps/mobile — Agent Rules

## Overview
React Native mobile app for SafeCampus PUCP field operators (security personnel).

## Stack (planned)
- **Framework**: React Native + Expo
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind for RN)
- **Components**: Shared primitives from `@safecampus/ui-kit` where possible

## Commands
```bash
pnpm dev              # expo start
pnpm build:android    # eas build --platform android
pnpm build:ios        # eas build --platform ios
```

## Conventions
- TSConfig extends `@safecampus/config/tsconfig/react-native.json`
- Import domain types from `@safecampus/shared-types`
- Operator-specific screens and components live here
- Use `@safecampus/ui-kit` for shared presentational components

## Anti-patterns
- **Never** import Next.js or web-specific code
- **Never** duplicate types already in `@safecampus/shared-types`
- **Never** put API client logic in components — use hooks or services
