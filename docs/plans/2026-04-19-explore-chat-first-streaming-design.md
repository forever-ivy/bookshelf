# Explore Chat-First Streaming Design

**Goal:** Refactor the Explore conversation experience so history never disappears during sends, DeepSeek reasoning and answer text both stream incrementally, and the message layout feels like a ChatGPT-style chat instead of a post-processed card stack.

## Context

The current Explore path already receives `explore.answer.delta` and `explore.reasoning.delta`, but the app still behaves like a post-hoc renderer:

- `startDraft()` in `stores/learning-conversation-store.ts` resets the conversation to just the current user message and one assistant draft, so older messages disappear while a reply is in progress.
- Explore messages are rendered from structured cards in `components/learning/learning-conversation-message.tsx`, so even when deltas arrive they do not read like one continuous assistant response.
- The final `assistant.final` payload rehydrates the answer only after the stream completes, which makes the UI feel blank during thinking and then jump to the finished answer.

That combination causes the visible bug the user reported:

1. Send a message.
2. Earlier messages disappear.
3. A thinking state shows.
4. The full answer appears only after the backend finishes.

## Decision

Refactor Explore into a chat-first message model from stream start to final persistence.

1. Keep all previously rendered messages in the conversation store while a new draft is active.
2. Treat the current Explore reply as a first-class streamed assistant message, not a temporary placeholder that replaces the whole store.
3. Render Explore streaming and final replies through one continuous chat-oriented layout:
   - collapsible `Explore` row on top
   - expandable reasoning text below that row
   - primary answer body below the reasoning section
4. Use the same layout for both streaming and final Explore messages so the UI does not jump between two different visual structures.
5. Keep Guide on the existing structured teaching-card path for now.

## Why This Approach

This is a bigger change than the earlier additive reasoning panel, but it directly matches the user's requested interaction:

- no history flash on send
- reasoning can stream before or alongside the answer
- answer text grows continuously on screen
- final state looks the same as streaming state, so there is no hard visual swap

It also reduces future UI drift because Explore becomes a stable chat surface instead of a streaming shim over card rendering.

## Data Flow

### Store

`startDraft()` should append the new user message and assistant draft to the existing message list instead of rebuilding the whole state.

The assistant draft keeps accumulating:

- `explore.reasoning.delta` into `presentation.reasoningContent`
- `explore.answer.delta` into `presentation.answer.content`

The rendered text for Explore should come directly from `presentation.answer.content`, not from a separate fallback that only becomes meaningful after finalization.

### History hydration

`hydrateHistory()` must preserve any active streaming draft and merge it after the latest persisted history. It should not cause earlier messages to vanish or reorder unexpectedly during a stream.

### Finalization

When `assistant.final` arrives:

- replace only the current assistant draft message
- preserve the existing user message and earlier history
- keep the Explore chat-first layout and just switch `streaming` to `false`

## UI Behavior

### Streaming

- Existing history stays on screen.
- The new user bubble appears at the bottom immediately.
- A new assistant message appears under it.
- If only reasoning has streamed so far, show:
  - `Explore` row
  - expandable reasoning text when opened
  - a lightweight streaming cursor or partial answer area below
- As answer deltas arrive, the main answer body grows character by character.

### Final

- The same Explore message remains in place.
- Cursor/thinking affordances disappear.
- The message keeps the same ordering:
  - `Explore`
  - reasoning text
  - divider
  - answer text

### Non-goals

- Do not refactor Guide to chat-first in this pass.
- Do not redesign citation/follow-up actions yet.
- Do not change backend SSE semantics beyond the already-supported Explore delta events.

## Testing Strategy

Focus on app-side regression coverage:

1. store tests:
   - starting a draft preserves prior history
   - Explore deltas accumulate into one active assistant draft
2. route/provider tests:
   - submitting an Explore message leaves prior messages visible while streaming
   - streamed Explore content appears before `assistant.final`
3. component tests:
   - Explore streaming messages render reasoning above answer
   - final Explore messages use the same layout without a card-style swap

## Risks

- The store change affects all in-flight sends, so tests must explicitly protect Guide behavior.
- Explore final rendering currently depends on `cards`; switching to a chat-first path must avoid breaking historic Explore turns with persisted presentations.
- Scroll-to-bottom behavior must remain stable while streamed text expands.
