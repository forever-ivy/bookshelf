# 2026-03-31 Profile Sheet Design

## Goal

- Remove the existing `me` tab from the primary tab bar.
- Add a liquid-glass profile trigger to the top-right corner of each primary route.
- Open the profile surface as a native bottom sheet on iOS and Android.

## Chosen Approach

- Keep the existing floating-navigation pattern by introducing a global profile trigger layer that mirrors the secondary back button.
- Centralize presentation state in a `ProfileSheetProvider` so the sheet can be opened from the floating trigger and from other flows.
- Reuse the account-center data and sections from the existing `me` route by extracting them into shared content that can render inside both the route and the native sheet.

## Scope

- Primary routes are `/`, `/search`, and `/borrowing`.
- Native bottom sheet only applies on iOS and Android.
- The legacy `/profile` route remains available for deeper profile details.

## Interaction Notes

- The trigger uses the same glass implementation family as the secondary back button.
- iOS uses `@expo/ui/swift-ui` `BottomSheet`.
- Android uses `@expo/ui/jetpack-compose` `ModalBottomSheet`.
- The hidden `me` route is no longer part of the visible tab bar.

## Regression Risks

- Floating trigger may overlap large titles if the header spacing is too tight.
- Secondary flows that previously navigated to `/(tabs)/me` must be redirected to the new sheet-opening path.
- Tests need updates for the reduced tab count and new root-level overlay.
