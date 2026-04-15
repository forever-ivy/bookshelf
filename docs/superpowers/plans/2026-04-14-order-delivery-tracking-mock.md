# Order Delivery Tracking Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mock robot-delivery tracking hero to the order detail route with distance, ETA, and circular proximity visualization.

**Architecture:** Drive the feature from a focused borrowing helper that converts an order into a delivery-tracking view model, render that state in a new borrowing component, and gate the route integration to robot-delivery orders only. Keep API types unchanged so the prototype stays isolated from service contracts.

**Tech Stack:** Expo Router, React Native, Jest, Testing Library

---

### Task 1: Lock the delivery-tracking behavior with tests

**Files:**
- Create: `__tests__/lib/borrowing/order-delivery-tracking.test.ts`
- Modify: `__tests__/app/order-detail-route.test.tsx`

- [ ] **Step 1: Write failing tests**

Add assertions that:
- robot-delivery orders produce tracking metrics and copy
- delivered robot-delivery orders collapse to `0 m` and an arrival message
- cabinet-pickup orders do not render the tracking hero

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- --runTestsByPath __tests__/lib/borrowing/order-delivery-tracking.test.ts __tests__/app/order-detail-route.test.tsx`
Expected: FAIL because the helper and route UI do not exist yet.

### Task 2: Build the mock tracking helper and hero component

**Files:**
- Create: `lib/borrowing/order-delivery-tracking.ts`
- Create: `components/borrowing/delivery-tracking-hero.tsx`

- [ ] **Step 1: Add the minimal mock tracking helper**

Return a small view model with:
- state label and supporting copy
- remaining distance and ETA labels
- normalized progress for the circular marker position
- fallback behavior for robot-delivery orders that do not expose a full fulfillment phase

- [ ] **Step 2: Render the circular tracking hero**

Build a self-contained card that shows:
- title and state copy
- circular proximity field with the reader destination in red
- truck marker positioned from the mock progress
- remaining distance and ETA metrics

### Task 3: Integrate the hero into the order detail route

**Files:**
- Modify: `app/orders/[orderId].tsx`

- [ ] **Step 1: Gate the hero to robot-delivery orders**

Compute the delivery-tracking view model from the order and render the hero between the summary card and the existing borrowing journey.

- [ ] **Step 2: Keep the route layout stable**

Preserve the existing action section, journey card, and non-delivery orders.

- [ ] **Step 3: Run the targeted tests to verify they pass**

Run: `npm test -- --runTestsByPath __tests__/lib/borrowing/order-delivery-tracking.test.ts __tests__/app/order-detail-route.test.tsx`
Expected: PASS

### Task 4: Final verification

**Files:**
- Modify: none if verification passes

- [ ] **Step 1: Run the focused regression set**

Run: `npm test -- --runTestsByPath __tests__/lib/borrowing/order-delivery-tracking.test.ts __tests__/app/order-detail-route.test.tsx __tests__/lib/borrowing/order-journey.test.ts`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Note residual risk**

Call out that the mock visualization is code-verified, but no simulator/device visual pass was run unless requested.
