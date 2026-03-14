# Milestone Badge Design

**Goal:** Replace the current text-only milestone chips with badge tiles that show the existing milestone PNG artwork, a soft halo around the icon, and a label beneath it.

## Approved Direction

Use the milestone PNGs already stored in [`assets/milestone`](/Users/Code/bookshelf-client/bookshelf-main/assets/milestone) as the primary badge artwork.

Each milestone badge should render as:

- icon centered at the top
- a soft circular halo around the icon
- a short label centered below the icon
- a compact rounded tile background so badges still sit cleanly in a wrapped grid

## Why This Direction

- It makes the milestone area feel like actual rewards instead of raw backend keys.
- It reuses assets that already exist in the project.
- It keeps the profile page layout simple while making the badges more expressive.

## Guardrails

- Known backend keys should map to local PNG files.
- Unknown keys should still render safely with a fallback label and no crash.
- The badge tile should stay readable on smaller phones and when multiple badges wrap.
