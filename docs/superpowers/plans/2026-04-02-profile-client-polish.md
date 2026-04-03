# Profile Client Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the profile experience feel more concise, client-facing, and intentionally designed without changing the underlying data model.

**Architecture:** Keep the existing route structure and shared profile components, but tighten copy and strengthen hierarchy in the profile hero, section headers, and sheet header. Preserve current mock/data wiring so only presentation-facing files and tests change.

**Tech Stack:** Expo Router, React Native, Jest, Testing Library

---

### Task 1: Refresh the profile route language and hierarchy

**Files:**
- Modify: `app/profile.tsx`
- Modify: `components/profile/reading-profile-hero.tsx`
- Test: `__tests__/app/profile-route.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
expect(screen.getByText('陈知行')).toBeTruthy();
expect(screen.getByText('借阅偏好概览')).toBeTruthy();
expect(screen.getByText('近期节奏')).toBeTruthy();
expect(screen.queryByText('陈知行 · 借阅偏好')).toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/app/profile-route.test.tsx`
Expected: FAIL because the route still renders the old title and section wording.

- [ ] **Step 3: Write minimal implementation**

```tsx
<ReadingProfileHero
  headline={profile?.displayName ?? '借阅档案'}
  title="借阅偏好概览"
  summary="客户可快速了解阅读方向、借阅活跃度与近期节奏。"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/app/profile-route.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/profile.tsx components/profile/reading-profile-hero.tsx __tests__/app/profile-route.test.tsx
git commit -m "feat: polish profile route presentation"
```

### Task 2: Tighten the profile sheet intro copy

**Files:**
- Modify: `components/profile/profile-sheet-content.tsx`
- Test: `__tests__/components/profile/profile-sheet-content.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
expect(screen.getByText('账户')).toBeTruthy();
expect(screen.getByText('查看资料、借阅记录与常用入口。')).toBeTruthy();
expect(screen.queryByText('个人中心')).toBeNull();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/components/profile/profile-sheet-content.test.tsx`
Expected: FAIL because the sheet still shows the old title and description.

- [ ] **Step 3: Write minimal implementation**

```tsx
<Text>账户</Text>
<Text>查看资料、借阅记录与常用入口。</Text>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/components/profile/profile-sheet-content.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/profile/profile-sheet-content.tsx __tests__/components/profile/profile-sheet-content.test.tsx
git commit -m "feat: tighten profile sheet copy"
```
