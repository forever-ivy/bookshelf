# 2026-04-14 Order Delivery Tracking Design

## Goal

- Add a mock-only robot delivery tracking module to the order detail route.
- Show remaining distance, estimated delivery time, and a circular proximity visualization where the reader is the red destination dot.

## Chosen Approach

- Keep the existing order summary and borrowing journey sections intact.
- Insert a dedicated delivery tracking hero card on `app/orders/[orderId].tsx` only when `order.mode === 'robot_delivery'`.
- Derive all delivery-tracking values from a small mock view-model helper instead of changing API contracts or mock backend payloads.

## Scope

- Add a circular distance-field visualization with a fixed reader destination point and a truck marker whose position is driven by mock progress.
- Show three delivery states: in transit, nearing destination, and delivered.
- Preserve current route actions and journey rail behavior.

## Regression Risks

- The new hero card can compete visually with the existing borrowing journey if the spacing and hierarchy are not kept clear.
- Robot-delivery orders without explicit fulfillment data still need a stable fallback state so the UI does not disappear unexpectedly.
- Route tests need to cover both the robot-delivery and cabinet-pickup paths so the new card does not leak into pickup orders.
