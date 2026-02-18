

# Visual Coherence and Harmony Pass

This plan refines the existing product to feel more structured and intentional without changing its identity. Every change preserves calm and ritual integrity.

---

## 1. Typography System -- Strict 3-Tier Hierarchy

**Problem**: Font sizes vary across screens (e.g., `text-2xl`, `text-3xl`, `text-xl` used inconsistently for similar roles). Section headers differ in treatment.

**Changes**:

- **Level 1 (Ritual Headline)**: Serif, `text-2xl`, used only for: Explore header, Capture prompt, Capture confirmation headline, Archive title. Consistent scale everywhere.
- **Level 2 (Section Title)**: Serif, `text-lg`, used for: Activity header, Profile display name, "Today Around the World", empty state headings, "Last 7 days" label upgrade. All section titles use identical size/weight.
- **Level 3 (Meta Text)**: Already defined as `.text-meta` (`text-xs text-muted-foreground`). Ensure all dates, locations, counts, and secondary descriptions use this class uniformly.

**Specific fixes**:
- Capture prompt currently uses `text-3xl` -- normalize to `text-2xl` to match other Ritual Headlines
- Profile `h1` uses `text-xl` without `font-serif` -- change to `text-lg font-serif` (Section Title)
- UserProfile `h1` same fix
- Archive cards prompt text: keep `text-lg font-serif italic` (correct Level 2)

---

## 2. Spacing and Vertical Rhythm -- 8pt Grid

**Problem**: Inconsistent top padding, section gaps, and card padding across screens.

**Changes (standardize across all major screens)**:
- Top safe area: `pt-14` (56px) for all sticky headers, `pt-12` stays where already used
- Header bottom padding: `pb-4` uniformly
- Section spacing: `space-y-4` or `py-6` between major sections
- Card internal padding: `p-4` universally
- Stats row gap: `gap-6` consistently (currently `gap-8`)
- Breathing room below headers before content: `py-6` (48px)

**Files affected**: Profile, UserProfile, Activity, Archive, Explore, PostDetail

---

## 3. Unified Card System

**Problem**: Explore uses `rounded-sm` grid tiles, Archive uses `rounded-xl bg-card border`, Activity uses divider-based list items, Profile uses `rounded-lg` tiles. No shared pattern.

**Define one card pattern and apply everywhere**:
- Border radius: `rounded-xl` for all cards/tiles
- Image corner radius within cards: `rounded-lg`
- Background: `bg-card` with `border border-border`
- Shadow: none (keep minimal)
- Internal padding: `p-4` when card has text content

**Specific changes**:
- **Explore grid**: Change `rounded-sm` to `rounded-xl`, increase `gap-1` to `gap-2`
- **Explore cluster thumbnails**: Already `rounded-lg` -- keep
- **Archive cards**: Already `rounded-xl bg-card border` -- keep (already matches)
- **Activity items**: Wrap each item in the card pattern instead of using `divide-y`
- **Profile 7-day grid**: Keep `rounded-lg` for small tiles (proportional to their size)
- **PostDetail image**: Already `rounded-xl` -- keep
- **Explore skeleton**: Change `rounded-sm` to `rounded-xl`

---

## 4. Accent Color Discipline

**Problem**: Accent color (`text-primary`, `fill-primary`) appears on the AppreciateButton heart, streak icon area, active nav, and CTA buttons. Too many accent-colored elements.

**Changes**:
- **AppreciateButton**: When filled, use `fill-foreground/60 text-foreground/60` instead of `fill-primary text-primary`. Appreciation is acknowledgment, not a reward signal.
- **Active nav tab (AppShell)**: Keep `text-primary` -- this is one of the two sanctioned uses.
- **CTA buttons**: Keep `bg-primary` -- sanctioned use.
- **Streak ring (RitualAvatar)**: Change from `ring-primary/*` to `ring-foreground/*` with lower opacity. The ring is a continuity signal, not an accent highlight.
- **Capture confirmation checkmark**: Change from `text-primary` to `text-foreground/60`. Calm, not celebratory.
- **Explore "Discover people" button**: Keep `bg-primary` -- it's a CTA.

---

## 5. Motion System

**Problem**: Current transitions are inconsistent (300ms, 500ms, mix of ease types). No tap feedback.

**Changes in `tailwind.config.ts` and `index.css`**:
- Add `duration-150` as default transition duration for interactive elements
- Define a `transition-ritual` utility: `transition-all duration-150 ease-out`
- Add `active:scale-[0.98]` to all tappable cards and buttons
- Standardize existing animations:
  - `animate-fade-in`: keep at 400ms (page-level, already feels right)
  - `animate-scale-in`: reduce to 200ms
  - RitualAvatar `transition-all duration-500` reduce to `duration-300`
  - Explore grid `group-hover:scale-105` reduce to `group-hover:scale-[1.02]` (subtler)
- Remove bounce/spring (none present, but ensure none introduced)

---

## 6. Capture Confirmation Refinement

**Problem**: The prompt is present but could have more breathing room. Participant count and streak messaging are visible.

**Changes**:
- Increase spacing above prompt: add `mt-4` breathing room
- Increase image max-width from `max-w-xs` to `max-w-sm` for more visual presence
- Change "others also captured today" to lighter phrasing: "{count} people participated today"
- Change streak messaging: already says "days of continuity" which is good -- keep
- Reduce visual weight of checkmark icon container: smaller (`h-10 w-10`), lighter background (`bg-secondary`)
- Add more space between text block and image: `mb-10` instead of `mb-8`

---

## 7. Explore Density Calibration

**Problem**: Grid tiles have tight spacing, appreciation icons with counts are visible in grid view, creating visual noise.

**Changes**:
- Increase grid gap from `gap-1` to `gap-2`
- Increase image corner radius from `rounded-sm` to `rounded-xl` (part of unified card system)
- **Hide appreciation counts and note icon in grid view** -- remove `AppreciateButton` and `MessageSquare` from Explore grid overlay entirely. Keep them only in PostDetail.
- Simplify grid overlay to show only username and city
- Reduce overlay gradient intensity from `from-foreground/50` to `from-foreground/40`
- Increase cluster section vertical spacing from `py-6` to `py-8`

---

## Technical Summary of Files Changed

| File | Changes |
|------|---------|
| `src/index.css` | Add `transition-ritual` utility, adjust `animate-scale-in` duration |
| `tailwind.config.ts` | Update `scale-in` keyframe duration |
| `src/pages/Explore.tsx` | Unified card radius, remove grid appreciation buttons, adjust spacing/density |
| `src/pages/Activity.tsx` | Wrap items in card pattern, standardize spacing |
| `src/pages/Archive.tsx` | Standardize header padding |
| `src/pages/Profile.tsx` | Fix heading to Section Title level, standardize stats gap, add tap feedback |
| `src/pages/UserProfile.tsx` | Same heading/stats fixes as Profile |
| `src/pages/Capture.tsx` | Normalize prompt to `text-2xl`, refine confirmation screen spacing and tone |
| `src/pages/PostDetail.tsx` | Standardize header padding |
| `src/components/RitualAvatar.tsx` | Change ring color from primary to foreground, reduce transition duration |
| `src/components/AppreciateButton.tsx` | Change filled heart color from primary to foreground/60 |
| `src/components/AppShell.tsx` | Add `active:scale-[0.98]` to nav buttons |

