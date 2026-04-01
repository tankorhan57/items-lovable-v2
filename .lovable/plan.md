

# Daily Hangman Mini-Game

## Summary
Add a daily Hangman game before the capture flow. Users guess the daily prompt letter-by-letter with 6 wrong guesses max. A pixel-art adventure mascot reacts emotionally to wrong guesses. The game never blocks posting. Results are saved and ranked against the community.

## Adaptation Notes
The prompt targets Next.js/Prisma but this project uses React/Vite/Supabase. All references to server actions, Prisma, and App Router will be adapted to Supabase tables, RPC functions, and React components.

---

## Step 1: Database — `game_results` table

Migration SQL:
- Create `game_results` table: `id uuid PK`, `user_id uuid NOT NULL`, `daily_item_id uuid NOT NULL`, `wrong_guesses int NOT NULL` (0-6), `solved_at timestamptz DEFAULT now()`
- Unique constraint on `(user_id, daily_item_id)`
- Index on `daily_item_id`
- RLS: users insert/select own rows; all authenticated users can read aggregate data for ranking
- Create RPC `get_game_ranking(p_daily_item_id uuid, p_wrong_guesses int)` returning `top_percent numeric, avg_wrong numeric` — calculates percentile and average from all results for that daily item

## Step 2: `GameCharacter` component

**File**: `src/components/GameCharacter.tsx`

- Inline SVG pixel art on a 14x22 grid, rendered via `<rect>` elements with `shape-rendering="crispEdges"`
- Indiana Jones-inspired adventure character with the specified color palette
- 7 states (0-6): only face pixels (eyes, eyebrows, mouth) and arm positions change
- State 0: happy, waving arm. States 1-5: escalating fear (wider eyes, sweat drops, open mouth). State 6: defeated with jail-bar overlay
- CSS `@keyframes pixelShake` for states 4-5 (subtle 2-3px oscillation)
- Props: `state: 0|1|2|3|4|5|6`, `size?: number` (default 3), `animate?: boolean`

## Step 3: `PromptGame` component

**File**: `src/components/PromptGame.tsx`

Client component with three phases:

**Greeting phase**: Full-screen, centered GameCharacter (state 0), speech bubble "Hey! Can you guess today's item? 🎯", auto-advances in 2s or tap to skip.

**Game phase**:
- GameCharacter centered, animates between states based on `wrongCount`
- Wrong counter: `✕ 0 / 6`
- First-time "How to Play" tooltip (tracked via `localStorage` key `items-game-seen`)
- `?` help icon top-right to re-show tooltip
- Phrase display: row of letter boxes showing spaces openly, revealed letters, and blank `_` boxes
- A-Z keyboard in 3 rows (9/9/8): default, correct (green), wrong (grayed) states
- "Give up" link at bottom
- On solve or fail: save result via Supabase insert + RPC call for ranking

**Result phase**:
- Win: GameCharacter state 0, "You cracked it!", wrong count, "Top X% today", community average
- Lose: GameCharacter state 6 with bars, reveals prompt, "Better luck tomorrow", community average
- "Continue to Camera →" button + 3s auto-advance countdown

**localStorage**: `items-game-{dateKey}` stores wrong count after completion to skip on revisit.

Props: `prompt: string`, `dailyItemId: string`, `dateKey: string`, `onComplete: (wrongGuesses: number) => void`

## Step 4: Integrate into Capture page

**File**: `src/pages/Capture.tsx`

- Add `gameDone` state, default `false`
- On mount (in `loadDailyState`): if localStorage has `items-game-{dateKey}`, set `gameDone = true`
- Before the immersion/capture flow renders, if `!gameDone && prompt && !hasPosted`: render `<PromptGame>` instead
- On game complete: set `gameDone = true`, proceed to existing immersion → capture flow
- If user already posted today, skip game entirely

## Step 5: Hide prompt in Explore locked state

**File**: `src/pages/Explore.tsx`

- In the "World" tab locked state (when user hasn't posted), replace the visible prompt text with: "Today's item is waiting... Play to reveal it"
- This prevents spoiling the game

---

## Technical Details

- No Framer Motion — use existing Tailwind animations (`animate-fade-in`, `animate-scale-in`) and CSS keyframes for character shake
- Game ranking RPC uses SQL `COUNT` and `AVG` aggregations, returns percentile as integer
- Character SVG is ~200 rect elements per state; only face/arm rows differ, so a base body array is shared with state-specific overrides
- All game CSS uses existing design tokens from `index.css` (`--background`, `--foreground`, `--card`, `--border`, `--primary`, `--muted-foreground`)

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/..._game_results.sql` | Create table + RLS + RPC |
| `src/components/GameCharacter.tsx` | Create — SVG pixel art, 7 states |
| `src/components/PromptGame.tsx` | Create — greeting + game + result |
| `src/pages/Capture.tsx` | Add game gate before immersion |
| `src/pages/Explore.tsx` | Hide prompt in locked state |

