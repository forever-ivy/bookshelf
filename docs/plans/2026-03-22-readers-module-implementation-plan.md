# Readers Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `readers` module as a reader hub with self-service profile endpoints and admin-facing reader overview endpoints.

**Architecture:** Add a thin `readers` repository/service layer that aggregates existing reader-linked tables without duplicating order, recommendation, or conversation write logic. Expose separate reader-only `me/*` endpoints and admin-only reader management endpoints from the same router.

**Tech Stack:** FastAPI, SQLAlchemy 2, PostgreSQL, Pydantic, Pytest

---

### Task 1: Add readers schemas

**Files:**
- Create: `app/readers/schemas.py`
- Test: `tests/test_readers_api.py`

**Step 1: Write the failing test**

Add a test that calls `GET /api/v1/readers/me/profile` and asserts the JSON has a `profile` object with `id`, `display_name`, and `college`.

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_readers_api.py::test_reader_can_get_own_profile -v`
Expected: FAIL because the route or schema does not exist yet.

**Step 3: Write minimal implementation**

Create `app/readers/schemas.py` with:

- `ReaderProfileResponse`
- `ReaderProfileUpdate`
- `ReaderOverviewResponse`
- `ReaderListItem`
- `ReaderDetailResponse`

Only include fields needed by the planned routes.

**Step 4: Run test to verify import wiring still fails at route level**

Run: `uv run pytest tests/test_readers_api.py::test_reader_can_get_own_profile -v`
Expected: FAIL at missing route or missing handler, not missing schema.

**Step 5: Commit**

```bash
git add app/readers/schemas.py tests/test_readers_api.py
git commit -m "feat: add readers response schemas"
```

### Task 2: Add readers repository helpers

**Files:**
- Create: `app/readers/repository.py`
- Modify: `app/context/repository.py`
- Test: `tests/test_readers_api.py`

**Step 1: Write the failing test**

Add tests for:

- loading the current reader profile
- loading a reader overview with active orders and recent queries
- listing readers for admin

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_readers_api.py -v`
Expected: FAIL because repository functions do not exist.

**Step 3: Write minimal implementation**

Create `app/readers/repository.py` with functions:

- `get_reader_profile_by_profile_id`
- `update_reader_profile`
- `list_readers`
- `get_reader_overview`
- `get_reader_orders`
- `get_reader_conversations`
- `get_reader_recommendations`

Use existing query patterns from:

- `app/context/repository.py`
- `app/orders/service.py`
- `app/conversation/repository.py`
- `app/recommendation/repository.py`

Keep this layer read-heavy and aggregation-focused.

**Step 4: Run tests to verify query helpers behave**

Run: `uv run pytest tests/test_readers_api.py -v`
Expected: Some tests still fail on missing routes, but repository logic is importable and reachable.

**Step 5: Commit**

```bash
git add app/readers/repository.py app/context/repository.py tests/test_readers_api.py
git commit -m "feat: add readers repository helpers"
```

### Task 3: Implement reader self-service endpoints

**Files:**
- Modify: `app/readers/router.py`
- Modify: `app/core/auth_context.py`
- Test: `tests/test_readers_api.py`

**Step 1: Write the failing test**

Add tests for:

- `GET /api/v1/readers/me/profile`
- `PATCH /api/v1/readers/me/profile`
- `GET /api/v1/readers/me/overview`
- `GET /api/v1/readers/me/orders`

Also test that a reader cannot access another reader's admin-style route.

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_readers_api.py -v`
Expected: FAIL because routes are not implemented.

**Step 3: Write minimal implementation**

In `app/readers/router.py`:

- add reader-authenticated `me/*` endpoints
- reuse `require_reader`
- use repository helpers to fetch and update data

Do not duplicate order business logic; only read aggregated data.

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_readers_api.py -v`
Expected: Self-service tests PASS.

**Step 5: Commit**

```bash
git add app/readers/router.py app/core/auth_context.py tests/test_readers_api.py
git commit -m "feat: add reader self-service endpoints"
```

### Task 4: Implement admin-facing reader management endpoints

**Files:**
- Modify: `app/readers/router.py`
- Modify: `app/auth/schemas.py`
- Test: `tests/test_readers_api.py`

**Step 1: Write the failing test**

Add tests for:

- `GET /api/v1/readers`
- `GET /api/v1/readers/{reader_id}`
- `GET /api/v1/readers/{reader_id}/overview`
- `GET /api/v1/readers/{reader_id}/orders`
- `GET /api/v1/readers/{reader_id}/conversations`
- `GET /api/v1/readers/{reader_id}/recommendations`

Also test that a non-admin receives `403`.

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_readers_api.py -v`
Expected: FAIL because admin routes are not implemented.

**Step 3: Write minimal implementation**

Add admin-protected endpoints using `require_admin`.

Response shape should support the admin SaaS pages:

- list view
- detail header
- overview cards
- order list
- conversation list
- recommendation list

Avoid exposing write actions from this module.

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_readers_api.py -v`
Expected: Admin readers tests PASS.

**Step 5: Commit**

```bash
git add app/readers/router.py app/auth/schemas.py tests/test_readers_api.py
git commit -m "feat: add admin readers endpoints"
```

### Task 5: Verify integration and docs

**Files:**
- Modify: `README.md`
- Modify: `app/api/router.py`
- Test: `tests/test_app_bootstrap.py`
- Test: `tests/test_readers_api.py`

**Step 1: Write the failing test**

Add or update bootstrap/API tests to ensure the new readers endpoints appear in OpenAPI and the router is still mounted.

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_app_bootstrap.py tests/test_readers_api.py -v`
Expected: FAIL until docs/router wiring is complete.

**Step 3: Write minimal implementation**

- Confirm readers router stays included in `app/api/router.py`
- Document the new endpoints in `README.md`
- Keep the docs concise and aligned with existing module descriptions

**Step 4: Run full verification**

Run: `uv run pytest -q`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md app/api/router.py tests/test_app_bootstrap.py tests/test_readers_api.py
git commit -m "docs: document readers module endpoints"
```
