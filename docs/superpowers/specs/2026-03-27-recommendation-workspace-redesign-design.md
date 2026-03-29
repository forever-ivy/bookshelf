# Recommendation Workspace Redesign Design

**Date:** 2026-03-27

**Goal**

Redesign the admin recommendation workspace at `/recommendation` so it behaves like an editor-first operations surface rather than a loose dashboard. The page should make the active editing task obvious, move publish actions out of the hero region, and give preview and release context a clear secondary role.

## Context

The current page has two core problems:

1. The primary actions (`放弃改动` / `保存草稿` / `发布到 App`) sit in the page hero, which makes them feel detached from the editing workflow and visually float over the background.
2. The workspace is composed as a stack of large parallel panels, so the first screen does not clearly answer what the operator should do first.

The redesign should preserve the existing data model and feature set:

- recommendation slot editing
- topic area editing
- preview feed inspection
- validation state
- publication history

This redesign changes hierarchy and interaction framing, not product scope.

## Approved Direction

The approved direction is **Approach A: dual-column editor-first workspace**.

### Visual Thesis

Quiet, editorial, and operational: the page should feel like a recommendation editing desk with one dominant working surface, not a card mosaic or launch screen.

### Content Plan

1. Light status header
2. Primary editing workspace
3. Secondary preview and release context
4. Fixed action bar

### Interaction Thesis

1. A persistent bottom action bar keeps save/publish actions available without occupying the hero.
2. The right-side preview responds immediately to edits and remains visually secondary.
3. Slot reordering and section transitions use short, restrained motion to reinforce editing flow rather than decorate the page.

## Page Architecture

### 1. Header Becomes Status-Only

The top of the page should no longer carry the main call-to-action cluster.

It keeps only:

- page title and description
- live version reference
- draft sync state
- validation count / release readiness

This area is informational only. It should establish context in one glance and immediately hand focus to the editing surface.

### 2. Main Body Uses a Dual-Column Editor Layout

The page body becomes a two-column layout.

**Left column: primary editing surface**

- `书目位编排`
- `专题位编排`

This column owns the operator's attention and should visually dominate width, density, and scroll flow.

**Right column: supporting context**

- `App 预览`
- `发布状态 / 发布前校验`
- `最近发布记录`

This column should remain available and informative, but must never compete with the editor column for first attention.

### 3. Bottom Action Bar Owns Commit Actions

The action cluster moves to a fixed bottom bar.

The bar contains:

- left side: one short status line such as `草稿有 2 处待处理` or `草稿已同步`
- right side: `放弃改动` / `保存草稿` / `发布到 App`

This keeps the commit actions tied to the editing workflow and eliminates the current floating-CTA problem.

## Section Hierarchy

### Left Column

#### Book Arrangement First

`书目位编排` is the default primary section and should be the first major block on entry.

Within it:

- `今日推荐`
- `考试专区`
- each slot row includes book selection, recommendation copy, and reorder/clear controls

Candidate pools should stay attached to the section they serve rather than feeling like unrelated blocks lower on the page.

The reading order should be:

`槽位 -> 候选 -> 推荐理由`

not:

`槽位 -> unrelated panel -> candidate list -> another panel`

#### Topic Arrangement Second

`专题位编排` follows the same editorial rhythm but with slightly lower visual priority than book arrangement.

It includes:

- hot list copy
- explanation card
- system booklist placement

This section remains important, but the page should communicate that book slot editing is the primary task.

### Right Column

#### App Preview First

The top of the right column is the live preview of the current draft. This lets the operator understand how the current edits will land without making preview the dominant mode of the page.

#### Release Context Second

`发布状态` and `发布前校验` sit below preview and answer:

- what is live now
- what is dirty
- what is blocking publish

#### Publication History Third

History is useful but low-frequency. It should remain visible in the right column and not claim a full-width primary panel unless there is a strong product reason later.

## Visual Rules

### Remove Dashboard Card Competition

The redesign should reduce the feeling of many equal-weight cards.

Preferred treatment:

- fewer panel types
- flatter surfaces
- stronger spacing rhythm
- clear width hierarchy between primary and secondary columns
- lighter borders and fewer standalone blocks

### Remove Floating Action Presence

The current top action grouping should not reappear as a pill cluster in the hero or as a floating glass bar. The actions belong to the working surface, not to the poster layer of the page.

### Keep Utility Copy

This is an operational tool, so headings and descriptions should remain utility-first.

Good examples:

- `书目位编排`
- `App 预览`
- `发布前校验`
- `最近发布记录`

Avoid marketing-style hero copy or mood statements.

## Responsive Behavior

### Desktop

- two-column layout
- left column wider than right
- bottom action bar fixed

### Tablet

- preserve two-column layout if width allows
- otherwise collapse to a single column with editor first and preview/release context second

### Mobile / Narrow Width

- single-column stack
- order remains:
  1. status header
  2. book arrangement
  3. topic arrangement
  4. preview
  5. release state
  6. history
  7. fixed bottom action bar

The action bar should remain compact and readable. It must not cover active form fields without adequate bottom padding.

## Motion

Motion should be present but understated.

Approved motion ideas:

- subtle section entrance reveal on initial load
- quick reorder transition for slot moves
- light preview-highlight response when a slot or topic edit changes the preview

Rejected motion ideas:

- decorative floating hero motion
- oversized glass transitions
- ornamental hover choreography on standard editor controls

## Implementation Notes

The redesign should preserve the current data and mutation flow:

- existing React Query usage
- existing save and publish mutations
- existing draft validation logic
- existing preview feed generation

Primary implementation changes should stay focused on:

- page composition
- section ordering
- action placement
- surface treatment
- responsive behavior

No product-scope changes are required for this pass.

## Acceptance Criteria

The redesign is successful when:

1. The page no longer places the main action buttons in the hero area.
2. The first viewport clearly communicates that the page is an editor-first workspace.
3. The left editing column is visually dominant over the preview/release column.
4. Preview and release context remain useful but clearly secondary.
5. The page reads as a coherent working surface rather than a stack of competing dashboard cards.
6. Save/publish actions remain easy to reach throughout editing.

## Testing Notes

Verification should cover:

- desktop hierarchy
- mobile stacking order
- persistent action bar behavior
- no regression in save/publish flow
- no regression in draft reset behavior
- no regression in preview updates
- no regression in publication history visibility
