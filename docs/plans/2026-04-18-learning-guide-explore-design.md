# Learning Guide / Explore V2.2 Design

## Summary

This design upgrades the current `learning v2` backend from a single step-driven tutoring flow into a dual-mode learning workspace:

- `Guide` is the mainline learning coach.
- `Explore` is the grounded free-question notebook mode.
- `Bridge` explicitly moves useful context between them.

The target experience is:

- if a user is clearly answering the current step, stay in `Guide`
- if a user is clarifying the current step, stay in `Guide` without evaluating
- if a user asks a question that drifts away from the current step, automatically route to `Explore`
- after routing, keep the user in `Explore` until they explicitly return or collect the result back into `Guide`

This design is intentionally asymmetric:

- `Guide` owns learning state
- `Explore` owns question solving
- `Bridge` owns reusable result transfer

## Product Principles

### Guide

`Guide` is not a second chat mode. It is the mainline learning controller.

Its responsibilities are limited to:

1. define the current step
2. explain why the step matters
3. show what passing looks like
4. judge whether the latest user turn advances the step
5. decide whether to continue, remediate, or redirect to `Explore`

Default `Guide` presentation should be coach-first, not conversation-first.

### Explore

`Explore` is the free-question mode modeled after notebook-style grounded Q&A.

Its responsibilities are:

1. answer user questions against the profile source pack
2. provide citations and related concepts
3. support deepening, examples, comparisons, and source clarification
4. optionally export a useful turn back into `Guide`

`Explore` does not advance steps, create checkpoints, or decide mastery.

### Bridge

`Bridge` is explicit and auditable.

It supports only two actions:

1. `expand_step_to_explore`
2. `attach_explore_turn_to_guide_step`

Bridge never directly advances progress. It only changes what `Guide` can use next.

## UX Model

### Guide presentation model

`Guide` uses a mixed presentation model:

- default view: coach-style
- key moments: role-expanded

Default visible cards:

- step card
- coach feedback card
- remediation card
- redirect card

Expanded role cards:

- teacher card
- peer card
- examiner card

Role cards should not appear every turn. They should only expand on high-value nodes:

- new step entry
- step explanation
- formal evaluation result
- remediation summary

### Explore presentation model

`Explore` is transcript-first and answer-first.

Each turn should show:

- grounded answer
- citations
- related concepts
- follow-up prompts
- collect-to-guide action

### Mode switching rules

Mode switching is driven by backend intent classification, not by frontend heuristics alone.

Rules:

- `Guide -> Explore`: automatic when a turn is classified as off-track exploration
- `Explore -> Guide`: explicit only
- after auto-routing to `Explore`, stay in `Explore`
- collecting an `Explore` turn back to `Guide` does not switch steps or auto-pass the step

## Intent Model

Every `Guide` turn must pass through a server-side intent gate before evaluation.

Allowed intent kinds:

- `step_answer`
- `step_clarify`
- `offtrack_explore`
- `control`

### step_answer

The user is answering the current step, summarizing it, or trying to explain it.

Behavior:

- retrieve current-step evidence
- run explanation plus evaluation
- create checkpoint
- progress or remediate

### step_clarify

The user is still asking about the current step, but not trying to answer it.

Examples:

- what is the key difference here
- why is this step important
- what am I still missing

Behavior:

- stay in `Guide`
- explain only
- do not create checkpoint
- do not trigger remediation

### offtrack_explore

The user is asking something worth answering, but it is not part of current-step evaluation.

Examples:

- horizontal comparison
- broader example
- source clarification
- cross-step jump
- open-ended notebook question

Behavior:

- create or reuse linked `Explore` session
- emit redirect event
- do not create checkpoint
- do not mark failure

### control

The user is issuing workflow commands.

Examples:

- continue
- go back
- summarize my current gap
- return to guide

Behavior:

- mutate session state directly
- no evaluation pipeline

## Guide State Machine

Current runtime should evolve from:

`load -> retrieve -> teacher -> peer -> examiner -> progress/remediation -> persist`

To:

`load_step_context -> classify_turn_intent -> route -> explain/evaluate -> progress/remediation -> persist`

Recommended runtime branches:

1. `step_answer`
   - retrieve current-step evidence
   - teacher
   - peer
   - examiner
   - progress or remediation
   - persist

2. `step_clarify`
   - retrieve current-step evidence
   - coach explanation
   - optional teacher or peer expansion
   - persist

3. `offtrack_explore`
   - create or reuse linked explore session
   - create bridge action with `trigger=auto`
   - emit redirect event
   - persist redirect turn

4. `control`
   - apply state mutation
   - persist control turn if useful for audit

## Backend Model Changes

This design stays inside the existing `learning_*` domain. No separate notebook schema is introduced.

### learning_sessions

Keep existing fields:

- `session_kind`
- `source_session_id`
- `source_turn_id`
- `focus_step_index`
- `focus_context_json`

Optional addition:

- `last_intent_kind`

### learning_turns

Add:

- `intent_kind`
- `response_mode`
- `redirected_session_id`

Definitions:

- `intent_kind`
  - `step_answer`
  - `step_clarify`
  - `offtrack_explore`
  - `control`

- `response_mode`
  - `coach`
  - `teacher_expanded`
  - `evaluation`
  - `remediation`
  - `redirected`

`Guide` turns may now exist without evaluation.

### learning_bridge_actions

Keep current action types:

- `expand_step_to_explore`
- `attach_explore_turn_to_guide_step`

Add metadata in `payload_json` or `result_json`:

- `trigger`
  - `auto`
  - `manual`
- `reason`
  - `offtrack_explore`
  - `user_tap`
  - `coach_suggestion`

### learning_step_context_items

Keep current structure.

It remains the main object for attaching `Explore` output back into the current `Guide` step.

## API Contract

### Existing endpoints to keep

- `POST /api/v2/learning/sessions`
- `POST /api/v2/learning/sessions/{id}/stream`
- `GET /api/v2/learning/sessions/{id}`
- `GET /api/v2/learning/sessions/{id}/turns`
- `GET /api/v2/learning/sessions/{id}/report`
- `POST /api/v2/learning/sessions/{id}/bridge-actions`

### New Guide streaming events

Add:

- `guide.intent`
- `session.redirect`

#### guide.intent

Payload:

- `kind`
- `confidence`
- `reason`

Used for:

- UI explanation
- debug telemetry
- test assertions

#### session.redirect

Payload:

- `targetSession`
- `targetMode`
- `reason`
- `carryInput`

Used for:

- automatic client mode switch from `Guide` to `Explore`
- preserving the original input

### Redirect flow

Recommended implementation:

1. user submits input to `Guide`
2. backend classifies it as `offtrack_explore`
3. backend creates or reuses linked `Explore` session
4. backend emits `session.redirect`
5. frontend switches to `Explore`
6. frontend automatically replays the original input into the target `Explore` session

This keeps sessions auditable and avoids mixed-mode streams.

## Retrieval Rules

### Guide retrieval

Guide retrieval remains step-centric.

Priority order:

1. `learning_step_context_items` for current step
2. graph candidates for current step
3. profile fragment hybrid search

This is correct for the mainline mode and should stay.

### Explore retrieval

Explore retrieval remains profile-wide, but can bias toward the originating step when it has focus context.

Priority order:

1. linked step context items if launched from `Guide`
2. graph candidates for focus keywords
3. profile-wide hybrid search

This keeps `Explore` broad without severing it from the mainline context.

## Frontend Architecture

### What to borrow from SurfSense

Use SurfSense as the main engineering reference for `Explore`.

Borrow:

- thread-first session semantics
- message history persistence
- separation between session runtime state and transcript history
- retrieval-backed answer mode with cited output

Do not borrow:

- full deep-agent platform complexity
- wide connector and collaboration surface

### What to borrow from expo-ai

Use `expo-ai` as the reference for the mobile chat shell.

Borrow:

- split between outer container, transcript view, and composer
- stable composer component that does not own business logic
- simple streaming message update loop

Do not borrow:

- RSC transport and server-rendered native UI

### What to borrow from OpenMAIC

Use OpenMAIC as the main engineering reference for `Guide`.

Borrow:

- explicit session type modeling
- orchestration layer separated from chat rendering
- disciplined SSE event protocol
- multi-role runtime as a backend concern, not a frontend improvisation

Do not borrow:

- classroom scene model
- slide and stage rendering
- always-on performance-style multi-agent chat

## Mapping to Current Bookshelf Codebase

### Backend

Primary modules to evolve:

- `app/learning/orchestrator.py`
- `app/learning/service.py`
- `app/learning/retrieval.py`
- `app/learning/router.py`
- `app/learning/models.py`
- `app/learning/schemas.py`

Key refactors:

- split guide runtime into intent-aware branches
- add redirect event path
- let `Guide` persist non-evaluated turns
- add explicit redirect metadata to turns

### App frontend

Primary modules to evolve:

- `app/learning/[profileId]/(workspace)/study/index.tsx`
- `components/learning/learning-workspace-provider.tsx`
- `components/learning/learning-conversation-message.tsx`
- `lib/api/learning.ts`
- `lib/learning/workspace.ts`

Key refactors:

- demote frontend heuristics from authority to optimistic pre-routing
- listen for backend `session.redirect`
- model `Guide` cards as state cards, not just transcript bubbles
- keep `Explore` transcript-first

## Testing Requirements

### Backend

Must cover:

1. `step_answer` creates checkpoint and may progress
2. `step_clarify` stays in guide and creates no checkpoint
3. `offtrack_explore` emits redirect and creates no remediation
4. redirect creates or reuses linked explore session
5. collected explore turn becomes top-priority guide context

### Frontend

Must cover:

1. guide default view is step-card led
2. automatic redirect switches mode to explore
3. redirected input is replayed into explore
4. returning from explore does not mutate guide progress
5. collecting explore output improves later guide evidence

## Recommendation

Build `learning v2.2` around this rule:

- `Explore` should feel like NotebookLM
- `Guide` should feel like a learning coach
- `Bridge` should make the two modes feel connected without collapsing them into one

That separation is the clearest way to get both:

- a practical product experience
- a distinctive competition narrative

The competition-facing description should be:

`A dual-mode library learning workspace where Explore provides grounded notebook-style questioning and Guide provides intent-aware mainline coaching, with explicit bridge actions that turn free exploration into reusable learning evidence.`
