# Theme System Refactor Design

**Goal:** Rebuild the app's visual foundation around semantic theme tokens so light mode is more intentional, dark mode is first-class, and special screens like scanner no longer rely on one-off hardcoded colors.

## Approved Direction

Use a full theme-system refactor instead of point fixes.

The new theme layer should:

- define separate light and dark palettes with semantic names instead of page-specific literals
- preserve the current typography and spacing system while moving colors, glass, borders, and shadows behind tokens
- expose a shared runtime hook so screens and components can read the active theme without duplicating `useColorScheme` logic
- cover shared surfaces and special flows, including scanner, instead of leaving dark mode as a tabs-only partial experience
- deepen the existing bubble treatment in light mode and provide a darker, lower-glare version for dark mode

## Architecture

The refactor will center on [`/Users/Code/bookshelf-client/bookshelf-main/constants/bookleaf-theme.ts`](/Users/Code/bookshelf-client/bookshelf-main/constants/bookleaf-theme.ts), which becomes the source of truth for:

- palette tokens
- glass tokens
- border and shadow tokens
- semantic component tokens for cards, navigation, hero backgrounds, scanner overlays, and progress visuals

A small theme hook will sit on top of the system color scheme and return a normalized theme object to every component. Shared UI primitives should adopt the hook first, then page routes should move off their remaining hardcoded colors.

This keeps the app's visual language consistent while avoiding a second ad-hoc theme layer inside individual screens.

## Token Model

The refactor should split tokens into these groups:

- `backgrounds`: app canvas, elevated surface, muted surface, soft surface, inverse surface
- `text`: primary, secondary, tertiary, inverse, accent
- `borders`: subtle, card, strong, inverse
- `glass`: fill, border, foreground, active foreground, accent wash
- `shadows`: soft, card, floating, accent
- `nav`: tab icon, tab pill, tab glass, active label
- `heroBubbles`: light and dark variants for `home` and `settings`
- `status`: success, warning, inactive, focus
- `scanner`: backdrop, frame, mask, helper text

The naming should describe intent, not pigment. Pages should ask for `theme.colors.surfaceElevated`, not `rgba(255,255,255,0.72)`.

## Migration Strategy

The migration should happen in three passes.

### Pass 1: Theme foundation

- split the current one-theme object into light and dark themes
- add a shared hook for runtime access
- update the root status bar to follow the active scheme
- add focused tests for theme selection and hero bubble token behavior

### Pass 2: Shared components

Refactor the components that influence most screens first:

- [`/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx`](/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx)
- [`/Users/Code/bookshelf-client/bookshelf-main/components/actions/glass-pill-button.ios.tsx`](/Users/Code/bookshelf-client/bookshelf-main/components/actions/glass-pill-button.ios.tsx)
- milestone, goal, cabinet, section, state, and avatar-related surfaces
- hero bubble background and other decorative layers

This pass reduces duplicated literals before screen-by-screen cleanup starts.

### Pass 3: Route adoption

Refactor the primary app surfaces and then the special flows:

- home, library, reports, settings
- profile, members, member form, goal settings, connect
- scanner and other flow screens that currently use isolated colors

Each route should compose existing semantic tokens rather than inventing new colors locally.

## Visual Direction

### Light mode

- keep the warm paper-like base, but increase contrast between canvas and elevated cards
- make hero bubbles richer and more noticeable without overpowering titles
- keep glass controls bright, airy, and slightly cooler than the background

### Dark mode

- avoid pure black; use deep blue-charcoal surfaces to preserve the app's calm tone
- shift bubbles to low-opacity cobalt, cyan, and muted coral accents so they still feel dimensional
- keep card edges and glass borders visible without creating neon outlines
- make charts, progress rings, and badges readable against dark surfaces before adding decorative glow

## Scanner and Special Screens

Scanner is a good example of why this must be global rather than page-local. It should use the same semantic tokens for:

- backdrop and scrim
- frame highlight and focus state
- helper text and secondary guidance
- buttons and overlays

That keeps the special flow aligned with the rest of the app instead of feeling like a separate prototype.

## Testing Strategy

The refactor should be protected with focused tests rather than broad snapshot churn.

- theme hook tests should verify light and dark selection
- hero bubble tests should verify stronger light colors and dedicated dark colors
- shared-component tests should assert they read theme tokens instead of fixed literals where practical
- route-level tests should ensure critical screens still render and key decorations remain mounted

Typecheck and lint remain required at the end of the migration.

## Guardrails

- Do not replace the current spacing and typography systems unless a component already needs theme-driven font treatment.
- Do not introduce a third-party design system; the goal is to strengthen the current custom system.
- Prefer semantic aliasing over endlessly adding new raw colors.
- Keep dark mode readable first and decorative second.
- Migrate existing screens in place so routes and navigation structure remain stable during the refactor.
