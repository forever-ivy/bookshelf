# App Foundation Design

**Date:** 2026-03-24

**Goal:** Initialize the `app` branch as a clean Expo Router application that matches the `ziggy/app-auth` tech stack and dependency set without carrying over any UI or feature flows.

## Scope

This setup will reuse the same Expo, React Native, routing, testing, linting, state, and data-fetching foundations as `ziggy/app-auth`.

It will include the project configuration files, install the same dependencies, create the same top-level directory structure, and provide a minimal bootable router shell.

It will not include auth flows, connect flows, tabs, modal screens, visual components, theme implementation, or business logic.

## Architecture

The app will use Expo Router as the entrypoint and a minimal root layout under `app/_layout.tsx`.

An `AppProviders` component will provide shared app-level providers with only the minimum runtime setup needed for initialization. React Query will be wired in now because it is part of the intended shared foundation.

Supporting directories such as `providers`, `stores`, `lib`, `hooks`, `components`, and `constants` will be created now so later work can build on stable paths instead of reshaping the project.

## Files And Structure

The scaffold will include:

- project config files: `.gitignore`, `package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `eslint.config.js`, `jest.config.js`, `jest.setup.ts`, `eas.json`
- app shell: `app/_layout.tsx`, `app/index.tsx`
- provider and utility foundation: `providers/app-providers.tsx`, `lib/app/query-client.ts`
- skeletal directories tracked via placeholder files where needed
- only the static image assets required by `app.json`

## Dependency Strategy

`package.json` and `package-lock.json` will align with `ziggy/app-auth` so the installed dependency graph matches exactly at this stage.

Project identity values that should differ from `app-auth`, such as name and slug, will be renamed to `app` with neutral placeholder identifiers.

## Testing And Verification

The initialization will add a small test that proves the provider shell can render children.

Verification will include installing dependencies, running the focused test suite, and running lint so the scaffold is evidenced rather than assumed.
