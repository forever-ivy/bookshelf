# Learning Conversation Message Redesign

**Date:** 2026-04-19

## Goal

Redesign only the conversation area in the learning workspace so it feels closer to a Claude or NotebookLM-style reading flow, while preserving the existing page layout, top buttons, bottom composer, routes, and message data model.

## Constraints

- Do not change the workspace shell, top chrome, or footer composer.
- Do not change `message.cards` or stream event handling.
- Keep both `guide` and `explore` message semantics intact.

## Chosen Approach

Adopt a "minimal reading flow" layout:

- User messages stay as right-aligned bubbles.
- Assistant text content becomes the only visible primary element in the main conversation flow.
- Evidence, related concepts, follow-ups, remediation, and redirect actions remain in data but are visually hidden from the primary message stream.

## Design Rules

- The assistant response should look readable first, structured second.
- The primary thread should visually match a Claude-style "user bubble plus assistant prose" rhythm.
- Supporting content should not occupy visible space in the main thread.
- Guide and Explore keep only a subtle mode chip for orientation.

## Implementation Scope

- Update `components/learning/learning-conversation-message.tsx`.
- Adjust or extend `__tests__/components/learning-conversation-message.test.tsx`.
- No route, store, or API changes.
