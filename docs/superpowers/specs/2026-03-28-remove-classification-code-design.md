# Remove Classification Code Design

## Goal

Remove classification-code data from the app contract so catalog and recommendation book models expose only the human-readable `category`.

## Scope

- Remove `classificationCode` from the shared `BookCard` type.
- Stop mapping `classification_code` and `classificationCode` from API payloads into app models.
- Remove classification-code values from local mock data and mock search indexing.
- Update contract tests so they only validate `category` semantics.

## Non-Goals

- No UI layout changes are required because the current app UI does not render `classificationCode`.
- No compatibility shim will be kept in the front-end model layer.

## Risks

- If a backend still returns `classification_code`, the front end will now ignore it completely.
- Mock search will no longer match queries that rely on classification-code text.

## Verification

- Targeted contract tests confirm returned book models do not expose `classificationCode`.
- Recommendation and catalog normalization still preserve `category`.
