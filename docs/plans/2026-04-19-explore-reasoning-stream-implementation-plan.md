# Explore Reasoning Stream Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stream DeepSeek `reasoning_content` through the Explore learning flow and render it as a collapsible "思维链" panel in the app.

**Architecture:** Extend the service Explore pipeline with one additive reasoning field and one additive SSE event, then teach the app types, stream parser, store, and Explore message renderer to accumulate and display that field. Persist the same field in final Explore presentation so history stays consistent after refresh.

**Tech Stack:** Python service, FastAPI SSE flow, TypeScript app client, Zustand store, React Native UI, Jest, pytest, uv.

---

### Task 1: Add failing service tests for Explore reasoning extraction and streaming

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf/tests/test_llm_provider.py`
- Modify: `/Volumes/Disk/Code/bookshelf/tests/test_learning_api.py`
- Modify: `/Volumes/Disk/Code/bookshelf/tests/test_learning_engine.py`

**Step 1: Write the failing tests**

Add tests that require:
- provider diagnostics/extraction to surface `reasoning_content`
- Explore workflow to return `reasoningContent`
- Explore SSE stream to include `explore.reasoning.delta`

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf && uv run pytest tests/test_llm_provider.py tests/test_learning_api.py tests/test_learning_engine.py -k "reasoning or explore" -q
```

Expected: FAIL because Explore flow still drops reasoning.

**Step 3: Write minimal implementation**

Update:
- `/Volumes/Disk/Code/bookshelf/app/llm/provider.py`
- `/Volumes/Disk/Code/bookshelf/app/learning/llm_flow.py`
- `/Volumes/Disk/Code/bookshelf/app/learning/orchestrator.py`

**Step 4: Run tests to verify they pass**

Run the same pytest command and confirm the new tests pass.

### Task 2: Add failing app tests for reasoning event parsing, store accumulation, and final normalization

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/api/learning-contract.test.ts`
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/stores/learning-conversation-store.test.ts`
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/components/learning-conversation-message.test.tsx`

**Step 1: Write the failing tests**

Add tests that require:
- SSE parser to normalize `explore.reasoning.delta`
- Explore final presentation to keep `reasoningContent`
- store draft state to append reasoning deltas
- Explore UI to show a collapsed `思维链` row and reveal text after tap

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/api/learning-contract.test.ts __tests__/stores/learning-conversation-store.test.ts __tests__/components/learning-conversation-message.test.tsx
```

Expected: FAIL because the app has no Explore reasoning field or UI.

**Step 3: Write minimal implementation**

Update:
- `/Volumes/Disk/Code/bookshelf-app/lib/api/types.ts`
- `/Volumes/Disk/Code/bookshelf-app/lib/api/learning.ts`
- `/Volumes/Disk/Code/bookshelf-app/stores/learning-conversation-store.ts`
- `/Volumes/Disk/Code/bookshelf-app/lib/learning/workspace.ts`
- `/Volumes/Disk/Code/bookshelf-app/components/learning/learning-conversation-message.tsx`

**Step 4: Run tests to verify they pass**

Run the same Jest command and confirm the new tests pass.

### Task 3: Verify the integrated service and app contract

**Files:**
- No new production files

**Step 1: Run targeted service verification**

```bash
cd /Volumes/Disk/Code/bookshelf && uv run pytest tests/test_llm_provider.py tests/test_learning_api.py tests/test_learning_engine.py -q
```

Expected: PASS

**Step 2: Run targeted app verification**

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/api/learning-contract.test.ts __tests__/stores/learning-conversation-store.test.ts __tests__/components/learning-conversation-message.test.tsx
```

Expected: PASS

**Step 3: Live smoke check**

Use the existing provider probe in `/Volumes/Disk/Code/bookshelf` to confirm `deepseek-reasoner` still returns `reasoning_content`, then exercise one Explore reply manually if needed.

