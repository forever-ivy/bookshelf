# Learning Guide / Explore V2.2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an intent-aware `Guide` and a NotebookLM-style `Explore` that are linked by explicit bridge actions, with automatic `Guide -> Explore` redirect for off-mainline questions.

**Architecture:** Keep the existing `learning_*` domain and extend it incrementally. The backend remains the authority for intent classification, routing, and persistence; the Expo app becomes an automatic follower that reacts to redirect events and renders `Guide` as a coach-first mainline interface with selective multi-role expansion.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, SSE, Expo Router, React Query, Zustand conversation store.

---

### Task 1: Add Intent And Redirect Fields To Learning Turns

**Files:**
- Create: `alembic/versions/20260418_01_learning_turn_intent_fields.py`
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/models.py`
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/schemas.py`
- Modify: `/Volumes/Disk/Code/bookshelf/tests/test_learning_api.py`

**Step 1: Write the failing test**

Add API assertions that `turn.intentKind`, `turn.responseMode`, and `turn.redirectedSessionId` are serialized for guide and explore turns.

```python
assert final_event["data"]["turn"]["intentKind"] == "step_answer"
assert final_event["data"]["turn"]["responseMode"] == "evaluation"
assert final_event["data"]["turn"]["redirectedSessionId"] is None
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_learning_api.py::test_learning_session_stream_progresses_when_answer_passes -q
```

Expected: FAIL because the response payload does not yet include the new fields.

**Step 3: Write minimal implementation**

- add nullable columns to `LearningTurn`:
  - `intent_kind`
  - `response_mode`
  - `redirected_session_id`
- add matching Alembic migration
- serialize these fields in `serialize_turn()`

**Step 4: Run test to verify it passes**

Run:

```bash
uv run pytest tests/test_learning_api.py::test_learning_session_stream_progresses_when_answer_passes -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add alembic/versions/20260418_01_learning_turn_intent_fields.py app/learning/models.py app/learning/schemas.py tests/test_learning_api.py
git commit -m "feat: add learning turn intent metadata"
```

### Task 2: Add A Server-Side Guide Intent Classifier

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/orchestrator.py`
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/llm_flow.py`
- Test: `/Volumes/Disk/Code/bookshelf/tests/test_learning_api.py`

**Step 1: Write the failing test**

Add tests for three guide turn classes:

- `step_answer`
- `step_clarify`
- `offtrack_explore`

Example:

```python
intent_event = next(event for event in events if event["event"] == "guide.intent")
assert intent_event["data"]["kind"] == "step_clarify"
assert "session.progress" not in event_names
assert "session.remediation" not in event_names
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_learning_api.py -k "guide_intent" -q
```

Expected: FAIL because no `guide.intent` event exists and all guide turns still follow the same evaluation path.

**Step 3: Write minimal implementation**

- add a classifier helper in `orchestrator.py`
- classify every guide turn before evaluation
- optionally allow `LearningLLMWorkflow` to classify if an LLM is enabled, but always keep a deterministic fallback heuristic
- emit:
  - `guide.intent`

Recommended fallback rules:

- answer-like summary -> `step_answer`
- current-step contract question -> `step_clarify`
- broad comparison / example / source clarification -> `offtrack_explore`
- command-like input -> `control`

**Step 4: Run test to verify it passes**

Run:

```bash
uv run pytest tests/test_learning_api.py -k "guide_intent" -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/learning/orchestrator.py app/learning/llm_flow.py tests/test_learning_api.py
git commit -m "feat: classify guide turn intent"
```

### Task 3: Split Guide Runtime Into Answer, Clarify, Redirect, And Control Paths

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/orchestrator.py`
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/repository.py`
- Test: `/Volumes/Disk/Code/bookshelf/tests/test_learning_api.py`

**Step 1: Write the failing test**

Add one test each for:

- `step_clarify` creates a guide turn but no checkpoint
- `offtrack_explore` creates no checkpoint and no remediation
- `control` mutates state without evaluation

Example:

```python
assert final_event["data"]["turn"]["intentKind"] == "step_clarify"
assert final_event["data"]["turn"]["evaluation"] is None
assert checkpoint_count == 0
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_learning_api.py -k "step_clarify or offtrack" -q
```

Expected: FAIL because the guide pipeline still always writes a checkpoint.

**Step 3: Write minimal implementation**

- branch guide runtime after intent classification
- only `step_answer` may enter examiner/progress/remediation path
- `step_clarify` should:
  - retrieve evidence
  - produce coach or teacher-expanded response
  - persist a guide turn with no evaluation
- `control` should:
  - mutate session state if needed
  - persist a control-flavored guide turn

**Step 4: Run test to verify it passes**

Run:

```bash
uv run pytest tests/test_learning_api.py -k "step_clarify or offtrack" -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/learning/orchestrator.py app/learning/repository.py tests/test_learning_api.py
git commit -m "feat: split guide runtime by intent"
```

### Task 4: Add Automatic Guide To Explore Redirect

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/orchestrator.py`
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/service.py`
- Modify: `/Volumes/Disk/Code/bookshelf/app/learning/schemas.py`
- Test: `/Volumes/Disk/Code/bookshelf/tests/test_learning_api.py`

**Step 1: Write the failing test**

Add a test where a guide turn asks an obviously off-mainline question and verify:

- `session.redirect` exists
- a linked explore session is created or reused
- the guide turn persists as `responseMode=redirected`
- no checkpoint or remediation is created

Example:

```python
redirect_event = next(event for event in events if event["event"] == "session.redirect")
assert redirect_event["data"]["targetMode"] == "explore"
assert redirect_event["data"]["targetSession"]["sessionKind"] == "explore"
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest tests/test_learning_api.py -k "session_redirect" -q
```

Expected: FAIL because guide currently never redirects.

**Step 3: Write minimal implementation**

- in the guide orchestrator, when intent is `offtrack_explore`:
  - call `LearningBridgeService.expand_step_to_explore()`
  - create a guide turn with:
    - `intent_kind="offtrack_explore"`
    - `response_mode="redirected"`
    - `redirected_session_id=<explore id>`
  - emit:
    - `session.redirect`
- include `trigger=auto` and `reason=offtrack_explore` in bridge metadata

**Step 4: Run test to verify it passes**

Run:

```bash
uv run pytest tests/test_learning_api.py -k "session_redirect" -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/learning/orchestrator.py app/learning/service.py app/learning/schemas.py tests/test_learning_api.py
git commit -m "feat: auto redirect offtrack guide turns to explore"
```

### Task 5: Extend App Learning API Types And SSE Parsing

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/lib/api/types.ts`
- Modify: `/Volumes/Disk/Code/bookshelf-app/lib/api/learning.ts`
- Test: `/Volumes/Disk/Code/bookshelf-app/__tests__/api/learning-contract.test.ts`

**Step 1: Write the failing test**

Add contract coverage for:

- `guide.intent`
- `session.redirect`
- new turn fields:
  - `intentKind`
  - `responseMode`
  - `redirectedSessionId`

Example:

```ts
expect(parsed.type).toBe('session.redirect');
expect(parsed.session.sessionKind).toBe('explore');
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand __tests__/api/learning-contract.test.ts
```

Expected: FAIL because the client does not yet recognize the new event types or fields.

**Step 3: Write minimal implementation**

- extend `LearningStreamEvent` union
- normalize new turn fields
- parse `guide.intent`
- parse `session.redirect`

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand __tests__/api/learning-contract.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add lib/api/types.ts lib/api/learning.ts __tests__/api/learning-contract.test.ts
git commit -m "feat: add guide intent and redirect client events"
```

### Task 6: Make The Workspace Provider Follow Backend Redirects

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/components/learning/learning-workspace-provider.tsx`
- Modify: `/Volumes/Disk/Code/bookshelf-app/app/learning/[profileId]/(workspace)/study/index.tsx`
- Modify: `/Volumes/Disk/Code/bookshelf-app/lib/learning/workspace.ts`
- Test: `/Volumes/Disk/Code/bookshelf-app/__tests__/app/learning-workspace-routes.test.tsx`

**Step 1: Write the failing test**

Add a route-level test that:

1. submits a guide message
2. receives a backend `session.redirect`
3. switches to `Explore`
4. replays the original input into the redirected session
5. stays in `Explore` afterward

Example:

```ts
expect(mockRouter.replace).toHaveBeenCalledWith('/learning/101/study?mode=explore');
expect(streamLearningSessionReply).toHaveBeenCalledWith(redirectedSessionId, '原问题', token);
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx
```

Expected: FAIL because the app still relies mainly on frontend heuristics and does not consume a backend redirect event.

**Step 3: Write minimal implementation**

- keep `shouldAutoRouteGuideDraftToExplore()` only as an optimistic shortcut
- in the provider stream loop:
  - handle `session.redirect`
  - update the workspace session with the target explore session
  - navigate to explore
  - replay the original input
- preserve the original guide session state for return

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add components/learning/learning-workspace-provider.tsx app/learning/[profileId]/(workspace)/study/index.tsx lib/learning/workspace.ts __tests__/app/learning-workspace-routes.test.tsx
git commit -m "feat: follow backend guide redirects in workspace"
```

### Task 7: Refactor Guide Rendering To Be Coach-First

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/lib/learning/workspace.ts`
- Modify: `/Volumes/Disk/Code/bookshelf-app/components/learning/learning-conversation-message.tsx`
- Modify: `/Volumes/Disk/Code/bookshelf-app/app/learning/[profileId]/(workspace)/study/index.tsx`
- Test: `/Volumes/Disk/Code/bookshelf-app/__tests__/lib/learning-workspace.test.ts`
- Test: `/Volumes/Disk/Code/bookshelf-app/__tests__/components/learning-conversation-message.test.tsx`

**Step 1: Write the failing test**

Add tests asserting that guide presentation builds:

- a stable coach card
- optional teacher card
- optional peer card
- examiner card only on evaluated turns
- remediation / redirect cards when present

Example:

```ts
expect(cards[0].kind).toBe('coach');
expect(cards.some((card) => card.kind === 'examiner')).toBe(true);
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --runInBand __tests__/lib/learning-workspace.test.ts __tests__/components/learning-conversation-message.test.tsx
```

Expected: FAIL because guide cards are still teacher-first.

**Step 3: Write minimal implementation**

- extend `LearningWorkspaceMessageCard`
- derive coach-first card order
- render role cards only when supported by metadata / presentation
- keep explore transcript rendering unchanged

Reference direction:

- coach-first product shape from the approved design
- lightweight mobile shell discipline from `expo-ai`

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --runInBand __tests__/lib/learning-workspace.test.ts __tests__/components/learning-conversation-message.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add lib/learning/workspace.ts components/learning/learning-conversation-message.tsx app/learning/[profileId]/(workspace)/study/index.tsx __tests__/lib/learning-workspace.test.ts __tests__/components/learning-conversation-message.test.tsx
git commit -m "feat: render guide as coach-first cards"
```

### Task 8: Run End-To-End Regression Checks Across Service And App

**Files:**
- Modify if needed: `/Volumes/Disk/Code/bookshelf/tests/test_learning_api.py`
- Modify if needed: `/Volumes/Disk/Code/bookshelf-app/__tests__/api/learning-contract.test.ts`
- Modify if needed: `/Volumes/Disk/Code/bookshelf-app/__tests__/app/learning-workspace-routes.test.tsx`

**Step 1: Write any final missing regression test**

If a gap remains, add one targeted regression only. Do not expand scope.

**Step 2: Run backend verification**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf
uv run pytest tests/test_learning_api.py -q
```

Expected: PASS

**Step 3: Run app verification**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf-app
npm test -- --runInBand __tests__/api/learning-contract.test.ts __tests__/app/learning-workspace-routes.test.tsx __tests__/lib/learning-workspace.test.ts __tests__/components/learning-conversation-message.test.tsx
```

Expected: PASS

**Step 4: Run lint / compile sanity**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf
uv run python -m py_compile app/learning/models.py app/learning/orchestrator.py app/learning/service.py app/learning/schemas.py

cd /Volumes/Disk/Code/bookshelf-app
npx eslint lib/api/learning.ts components/learning/learning-workspace-provider.tsx app/learning/[profileId]/(workspace)/study/index.tsx lib/learning/workspace.ts components/learning/learning-conversation-message.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Volumes/Disk/Code/bookshelf
git add tests/test_learning_api.py
git commit -m "test: lock guide explore redirect regressions"

cd /Volumes/Disk/Code/bookshelf-app
git add __tests__/api/learning-contract.test.ts __tests__/app/learning-workspace-routes.test.tsx __tests__/lib/learning-workspace.test.ts __tests__/components/learning-conversation-message.test.tsx
git commit -m "test: lock workspace guide explore behavior"
```

## Notes For The Implementer

- Treat backend intent classification as the source of truth.
- Keep frontend heuristics only as optimistic UX shortcuts.
- Do not merge `Guide` and `Explore` streams into one opaque server response.
- Preserve current explicit bridge actions.
- Keep the `Explore` experience transcript-first.
- Keep the `Guide` experience state-card-first.
- When in doubt, prefer the current repository boundaries over importing heavy abstractions from the three reference projects.

## Reference Mapping

- `SurfSense`: use as the mental model for `Explore` thread semantics and retrieval-backed notebook flow.
- `expo-ai`: use as the mental model for Expo chat shell composition and streaming UI boundaries.
- `OpenMAIC`: use as the mental model for `Guide` session discipline, SSE event design, and multi-role orchestration.
