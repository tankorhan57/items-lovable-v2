
# Ritual Identity Deepening

This phase strengthens daily immersion, collective presence, and temporal continuity without introducing any gamification, ranking, or engagement mechanics.

---

## 1. Daily Prompt Immersion Layer

**What changes**: When a user opens the Capture screen and has not yet posted today, the prompt is displayed in a full-screen immersive moment before the capture action is revealed.

**New component**: `src/components/DailyImmersion.tsx`
- Full-screen centered view with the daily prompt in large serif italic typography
- Generous vertical breathing space (centered vertically with `px-8`)
- Navigation bar is hidden (component renders above AppShell content)
- The capture button fades in after ~1000ms delay using a CSS animation
- Soft fade-in only, no bounce, spring, or celebratory effects
- Once dismissed (by tapping capture), the immersion view is removed for the rest of the UTC day via `sessionStorage`

**Optional enhancement**: Very subtle background hue shift based on prompt category:
- `color` category: warm rose tint (`bg-[hsl(350,20%,96%)]`)
- `environment` category: soft green tint (`bg-[hsl(140,15%,96%)]`)
- `time` category: cool blue tint (`bg-[hsl(220,15%,96%)]`)
- All others: default background
- These are nearly imperceptible -- the shift is only 1-2% from the base cream

**Changes to `src/pages/Capture.tsx`**:
- Fetch full `daily_items` row (including `category`) instead of just `id` and `prompt_text`
- Add state: `showImmersion` (true if not posted and not already seen today)
- If `showImmersion` is true, render `DailyImmersion` component instead of the normal capture UI
- When immersion completes (user taps to begin), transition to the standard capture view

**Changes to `src/index.css`**:
- Add `@keyframes delayed-fade-in` with a built-in delay approach using `opacity: 0` for the first portion
- Add `.animate-delayed-fade-in` class

---

## 2. Collective Presence Layer

### A. Reframe participation language

**Changes to `src/pages/Capture.tsx`** (confirmation screen):
- Change `"{todayCount} people participated today"` to `"{todayCount} people are seeing the world this way today."`

**Changes to `src/pages/Explore.tsx`**:
- In the cluster section, if a total count is shown, use collective phrasing

### B. Appreciation counts already hidden in grid
- The previous coherence pass already removed appreciation counts from Explore grid view -- confirm this remains intact. Only username and city are shown in the overlay.

### C. Subtle time-of-day markers in Explore

**Changes to `src/pages/Explore.tsx`**:
- Group posts by time-of-day based on `confirmed_at` timestamp:
  - Before 12:00 UTC: "Morning"
  - 12:00-17:00 UTC: "Afternoon"  
  - After 17:00 UTC: "Evening"
- Render a thin, muted text divider between groups: a simple `<p className="text-meta px-4 py-3">Morning</p>` between grid sections
- These are soft contextual markers, not section headers -- no bold, no icons
- Posts still render in chronological order; the dividers simply mark transitions

---

## 3. Temporal Depth Layer

### A. Continuity line under 7-day grid

**Changes to `src/pages/Profile.tsx`**:
- Below the 7-day grid, add a thin horizontal continuity visualization
- A flex row of 7 small segments (one per day), each `h-[2px]` tall:
  - Days with posts: `bg-foreground/30` (connected, present)
  - Missed days: `bg-border` (soft gap, no shame)
- Segments are separated by 1.5px gaps matching the grid above
- No color coding, no red/green, no icons -- just presence and absence

### B. Archive weekly grouping

**Changes to `src/pages/Archive.tsx`**:
- Group archive items by `week_number` field (already available in the `daily_items` table)
- Add subtle week dividers between groups: `<p className="text-meta px-0 pt-6 pb-2">Week {n}</p>`
- No calendar UI, no grid restructure -- just soft textual markers between existing cards
- If `week_number` is null, fall back to grouping by ISO week from `active_date`

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/components/DailyImmersion.tsx` | **New** -- Immersive prompt moment component |
| `src/pages/Capture.tsx` | Integrate immersion layer, fetch category, update collective language |
| `src/pages/Explore.tsx` | Add time-of-day section dividers |
| `src/pages/Profile.tsx` | Add continuity line below 7-day grid |
| `src/pages/Archive.tsx` | Group prompts by week with subtle dividers |
| `src/index.css` | Add delayed-fade-in animation keyframes |

No database changes required. All data fields (`category`, `week_number`, `confirmed_at`) already exist.
