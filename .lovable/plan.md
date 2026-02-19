

# Fix: Tinder-Quality Swipe Gestures

## Problem Diagnosis

After reviewing the code, I found several issues causing the weak/broken swipe behavior on mobile:

1. **Dual gesture conflict**: Both `PhotoFeedPager` (vertical) and `HorizontalReaction` (horizontal) have independent touch handlers that fire simultaneously on the same touch events. They each do their own axis detection independently with no communication -- so both systems process every touch, causing jitter and dropped gestures.

2. **Drag feels sluggish**: `dragResistance: 0.45` means the post only moves 45% of finger distance. On a phone, this feels unresponsive and "weak."

3. **Horizontal threshold too high**: `THRESHOLD = 80px` is too far for a quick phone swipe. Tinder uses roughly 40-60px.

4. **`touch-none` on pager container blocks child touch events**: The pager's `touch-none` CSS class disables default browser touch behavior on the entire area, which can interfere with the inner HorizontalReaction's gesture detection.

## Solution: Unified Gesture Coordinator

Instead of two independent gesture systems fighting over the same touch events, we'll create a single gesture coordinator at the pager level that:
- Captures all touch events once
- Determines axis (vertical vs horizontal) with a single decision
- Dispatches vertical movement to the pager logic
- Dispatches horizontal movement to the reaction logic

### Changes

**1. `src/components/PhotoFeedPager.tsx`**
- Add an `onHorizontalSwipe` callback prop
- Single touch handler determines axis, then either moves the track (vertical) or calls `onHorizontalSwipe` with dx/phase (horizontal)
- Remove duplicate axis detection
- Use `touch-pan-x` instead of `touch-none` so horizontal still feels native

**2. `src/components/HorizontalReaction.tsx`**
- Remove its own touch/mouse event listeners from the content div
- Instead, accept `dragX` and `phase` ("dragging" | "ended" | "idle") as props from the parent pager
- Apply visuals reactively based on these props
- This eliminates all gesture conflict -- HorizontalReaction becomes a pure visual/animation layer

**3. `src/lib/feed-anim-config.ts`**
- Increase `dragResistance` from `0.45` to `0.85` so the post tracks the finger much more closely
- Lower `snapThreshold` from `50` to `40` for snappier page turns

**4. `src/components/FollowingFeedTab.tsx`**
- Wire up the new `onHorizontalSwipe` from the pager to pass drag state into `HorizontalReaction`

**5. Horizontal reaction tuning**
- Lower `THRESHOLD` from `80` to `50px`
- Lower `VELOCITY_THRESHOLD` from `0.4` to `0.25` px/ms
- These make horizontal swipes feel responsive like Tinder

## Technical Detail

The unified gesture flow:

```text
Touch Start
    |
    v
Track dx, dy (both axes)
    |
    v
abs(dx) or abs(dy) > 10px?
    |
   YES
    |
    v
angle > 55 deg from horizontal? --> VERTICAL (pager moves track)
angle < 55 deg from horizontal? --> HORIZONTAL (pass dx to HorizontalReaction)
    |
    v
Axis locked until touch end
```

On touch end:
- If vertical: evaluate distance/velocity, snap to next/prev/current page
- If horizontal: evaluate distance/velocity, commit reaction or snap back

This guarantees exactly one system handles each gesture with zero conflict.

