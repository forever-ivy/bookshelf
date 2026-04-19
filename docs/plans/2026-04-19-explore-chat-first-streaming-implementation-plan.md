# Explore Chat-First Streaming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Explore so previous messages remain visible during sends and both reasoning and answer text stream incrementally in one chat-first assistant message.

**Architecture:** Keep the existing backend SSE contract and refactor the app around it. The Zustand store will preserve history and append one active draft, while the Explore message component will stop relying on card rendering and instead render one continuous chat-oriented layout for both streaming and final states.

**Tech Stack:** TypeScript, React Native, Expo Router, Zustand, Jest, Testing Library.

---

### Task 1: Lock the new Explore conversation state contract with failing store tests

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/stores/learning-conversation-store.test.ts`
- Modify: `/Volumes/Disk/Code/bookshelf-app/stores/learning-conversation-store.ts`

**Step 1: Write the failing test**

Add tests that require:
- `startDraft()` to preserve existing history instead of replacing it
- Explore deltas to accumulate into the appended assistant draft

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/stores/learning-conversation-store.test.ts
```

Expected: FAIL because `startDraft()` currently resets the entire conversation.

**Step 3: Write minimal implementation**

Update `/Volumes/Disk/Code/bookshelf-app/stores/learning-conversation-store.ts` so draft creation appends to existing history and finalization only replaces the active assistant draft.

**Step 4: Run test to verify it passes**

Run the same Jest command and confirm PASS.

### Task 2: Lock the chat-first Explore message rendering with failing component tests

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/components/learning-conversation-message.test.tsx`
- Modify: `/Volumes/Disk/Code/bookshelf-app/components/learning/learning-conversation-message.tsx`

**Step 1: Write the failing test**

Add tests that require:
- streaming Explore messages to render reasoning above answer in one continuous layout
- streaming Explore messages to show partial answer text before `assistant.final`
- final Explore messages to keep the same layout instead of falling back to card-style answer rendering

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/components/learning-conversation-message.test.tsx
```

Expected: FAIL because Explore still renders through `cards`.

**Step 3: Write minimal implementation**

Update `/Volumes/Disk/Code/bookshelf-app/components/learning/learning-conversation-message.tsx` to use a dedicated Explore chat-first renderer for both streaming and final Explore presentations.

**Step 4: Run test to verify it passes**

Run the same Jest command and confirm PASS.

### Task 3: Lock the on-screen streaming behavior with failing route/provider tests

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/app/learning-workspace-routes.test.tsx`
- Modify: `/Volumes/Disk/Code/bookshelf-app/components/learning/learning-workspace-provider.tsx` only if test evidence shows provider-specific draft handling is still wrong

**Step 1: Write the failing test**

Add a route test that submits an Explore message, then asserts:
- older messages are still visible during the stream
- streamed reasoning and/or answer text becomes visible before `assistant.final`

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx -t "keeps prior messages visible while explore streams"
```

Expected: FAIL because the active draft currently wipes visible history.

**Step 3: Write minimal implementation**

Adjust the provider/store integration only where the failing test proves necessary.

**Step 4: Run test to verify it passes**

Run the same Jest command and confirm PASS.

### Task 4: Run the targeted regression suite

**Files:**
- No new production files

**Step 1: Run store verification**

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/stores/learning-conversation-store.test.ts
```

Expected: PASS

**Step 2: Run component verification**

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/components/learning-conversation-message.test.tsx
```

Expected: PASS

**Step 3: Run route verification**

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx -t "keeps prior messages visible while explore streams|streams learning replies from the backend and consumes assistant.final events|keeps study content below the floating chrome"
```

Expected: PASS for the targeted Explore flow checks.
