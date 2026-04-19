# Explore Reasoning Stream Design

**Goal:** In the Explore workspace, stream DeepSeek's raw `reasoning_content` to the app and render it behind a collapsible "思维链" row below the answer, similar to ChatGPT's expandable reasoning panel.

## Context

The backend now runs `deepseek-reasoner`, and the service-side provider can detect `reasoning_content`. The current Explore flow still drops that field entirely:

- `app/learning/llm_flow.py` only returns `answer` and `relatedConcepts`
- `app/learning/orchestrator.py` only emits `explore.answer.delta`
- `bookshelf-app` types and store do not model Explore reasoning
- `LearningConversationMessage` only renders the Explore answer body

This means the app cannot show reasoning during streaming or after refresh.

## Decision

Use a dedicated Explore reasoning stream end-to-end.

1. Service provider exposes `reasoning_content` alongside the normal answer text.
2. Explore LLM workflow returns `reasoningContent` with the final answer payload.
3. Explore orchestration emits a new SSE event `explore.reasoning.delta` before `assistant.final`.
4. Final Explore presentation persists `reasoningContent` so history and refresh preserve it.
5. The app store accumulates `explore.reasoning.delta` into the current assistant draft.
6. The Explore message UI shows a compact collapsed row labelled `思维链`; tapping expands the raw reasoning text.

## Why This Approach

This is the smallest design that still matches the requested ChatGPT-like interaction:

- It supports streaming rather than only post-hoc rendering.
- It keeps reasoning separate from answer text, so the reading flow stays clean.
- It preserves reasoning in history, avoiding a streaming-only ghost state.
- It limits protocol changes to one additive event and one additive presentation field.

## Data Shape

Add `reasoningContent?: string` to Explore presentation on both service and app.

Streaming event:

```json
{
  "event": "explore.reasoning.delta",
  "data": {
    "delta": "..."
  }
}
```

Final Explore presentation:

```json
{
  "kind": "explore",
  "answer": { "content": "..." },
  "reasoningContent": "...",
  "evidence": [],
  "relatedConcepts": [],
  "followups": [],
  "bridgeActions": []
}
```

## UI Behavior

- Explore answer remains the primary visible content.
- If `reasoningContent` is empty, render nothing extra.
- If present, render a single collapsed row under the answer:
  - label: `思维链`
  - chevron down when collapsed
  - chevron up when expanded
- Expanding reveals the raw `reasoningContent` text in a secondary surface.
- Local expansion state stays in the message component; it does not need to be global or persisted.

## Risks

- DeepSeek may return large reasoning payloads; the collapsed default avoids overwhelming the screen.
- Streaming and final payloads must use the same field name to avoid draft/history mismatches.
- Since this is raw reasoning text, we should not silently merge it into the main answer bubble.

## Verification

- Service tests cover provider extraction, Explore workflow parsing, and SSE contract additions.
- App tests cover stream normalization, store accumulation, final history normalization, and UI expand/collapse behavior.
