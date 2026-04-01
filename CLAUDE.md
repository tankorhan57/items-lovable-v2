# Items — Complete Feature & UI Reference Document

## App Overview

**Items** is a daily photo-sharing social media PWA. Each day, a single prompt appears. Users capture one photo in response, then unlock a global feed of how others interpreted the same prompt. The app emphasizes intentionality, consistency, and calm social interaction.

**Tech Stack**: React 18, Vite 5, TypeScript 5, Tailwind CSS v3, Supabase (auth, database, storage, edge functions, realtime), React Query, next-themes, date-fns, sonner (toasts), lucide-react (icons).

**Design System**: HSL-based semantic tokens in `index.css` (`:root` and `.dark`), Tailwind config extends with custom colors/animations. Components use `surface-card`, `tap-scale`, `transition-ritual`, `text-meta` utility classes. Typography: serif for headings/prompts, sans-serif for body.

---

## 1. Authentication & Onboarding

### Auth Page (`/auth` → `src/pages/Auth.tsx`)
- **Modes**: `login`, `signup`, `forgot`, `check-inbox`
- **Login**: Email + password fields, "Sign in" button, "Forgot password?" link below
- **Signup**: Username + email + password fields. Username is lowercased, spaces → underscores. Checks duplicate usernames via `profiles` table before `supabase.auth.signUp()`. Passes `username` in `options.data` metadata. Requires email confirmation (NOT auto-confirmed)
- **Forgot Password**: Email field only, calls `supabase.auth.resetPasswordForEmail()` with redirect to `/reset-password`
- **Check Inbox**: Shows after signup or forgot-password. Displays email, "Resend email" button (`supabase.auth.resend()`), "Back to sign in" link
- **Footer**: Links to `/terms` and `/privacy`
- **UI**: Centered card, serif heading "Items.", subtitle "One prompt. One photo. A shared moment."

### Reset Password (`/reset-password` → `src/pages/ResetPassword.tsx`)
- Listens for `PASSWORD_RECOVERY` event via `supabase.auth.onAuthStateChange()`
- Shows spinner until recovery token detected
- Form: two password fields (new + confirm), min 6 chars
- Calls `supabase.auth.updateUser({ password })`
- On success: toast + navigate to `/`

### Onboarding (`/onboarding` → `src/pages/Onboarding.tsx`)
- 4-step flow (3 info slides + avatar upload)
- Slides: "One photo a day" (Camera icon), "Unlock the world" (Globe icon), "Build your ritual" (Flame icon)
- Avatar step: uses `AvatarUpload` component with size="lg"
- Progress dots at bottom, "Next"/"Begin" buttons
- On complete: sets `profiles.onboarding_completed = true`, calls `refreshProfile()`, navigates to `/`

### Auth Context (`src/lib/auth-context.tsx`)
- `AuthProvider` wraps entire app, provides: `session`, `user`, `profile`, `loading`, `signOut()`, `refreshProfile()`
- Profile type = `Tables<"profiles">` from Supabase types
- `ProtectedRoute` in `App.tsx`: redirects to `/auth` if unauthenticated, to `/onboarding` if `!profile.onboarding_completed`

### Database trigger (`handle_new_user`)
- On `auth.users` INSERT → creates `profiles` row (id, username from metadata, display_name) + `streaks` row

---

## 2. Core Daily Ritual

### Daily Immersion (`src/components/DailyImmersion.tsx`)
- Full-screen overlay shown once per day (tracked via `sessionStorage` key `immersion_seen` = UTC date)
- Displays today's prompt in large serif italic text with quotes
- Label: "Today's Item" (11px uppercase tracking-wide)
- Camera icon in circular border + "Begin" button with delayed fade-in animation
- On "Begin": stores today's UTC date in sessionStorage, calls `onBegin()` callback

### Capture Page (`/` — home route → `src/pages/Capture.tsx`)
- **States**: No prompt | Immersion | Photo selection | Preview + confirm | Confirmed
- Loads today's `daily_items` row (`active_date = CURRENT_DATE`), checks existing `posts` for that `daily_item_id`
- **No prompt**: "No prompt today" empty state with RefreshCw icon
- **Photo selection**: Full-height dashed border area, "Tap to capture" with Camera icon. Hidden `<input type="file" accept="image/*" capture="environment">`
- **File validation**: Max 10MB, toast error if exceeded
- **Geolocation**: `navigator.geolocation.getCurrentPosition()` on file select, calls `reverse-geocode` edge function for city name
- **Preview**: Image at 63vh height, rounded-2xl, shadow-card. "Retake" (outline btn) and "Confirm" (primary btn) buttons
- **Confirm flow**: `compressImage()` to 1200px/80% quality, uploads to `post-images` bucket as `{userId}/{timestamp}.jpg`, inserts `posts` row with `confirmed_at = now()`, city, daily_item_id
- **Confirmed screen**: Image, prompt in serif italic with quotes, city with MapPin icon, "{N} people seeing this today" community count, streak fire icon + count

### Daily Items Generation (`supabase/functions/generate-daily-items/index.ts`)
- JWT-authenticated edge function
- Generates prompts from a categorized prompt library with 35-day buffer
- Distribution: 70% concrete (depth 1-2), 20% grounded, 10% reflective (max 1/week)
- Categories: color, object, human, perspective, emotion, time, contrast, environment, surface, texture, movement, light
- Each row: `prompt_text`, `category`, `depth_level` (1-4), `tone` (concrete/interpretive/reflective), `week_number`, `active_date`

---

## 3. Explore / Discovery

### Explore Page (`/explore` → `src/pages/Explore.tsx`)
- **Two tabs**: "World" (global feed) and "Following" (friends feed)
- Tab pills at top with sticky header showing today's prompt
- **Gate**: "Following" tab requires `has_posted_today` RPC = true; otherwise shows "Post today's item to see your friends"

#### World Tab
- Shows today's prompt at top in serif italic
- Vertical feed of confirmed posts from today (`daily_items.active_date = CURRENT_DATE`)
- Excludes own posts, blocked users, and soft-deleted posts
- Each post card: rounded image, user avatar (32px) + display_name + @username, city + relative time
- Action buttons per post: `AppreciateButton` (heart toggle + count), Note (MessageSquare icon → `NoteComposer` drawer), Follow (UserPlus icon toggle)
- Infinite scroll via `useInfiniteScroll` hook with cursor-based pagination on `confirmed_at`
- `AppreciatorsModal` shows list of users who appreciated

#### Following Tab (`src/components/FollowingFeedTab.tsx`)
- Loads accepted `follows`, fetches last 10 days of `posts` from followed users
- Renders as `CardStack` (Tinder-style swipeable cards)
- Card overlay: @username (clickable → user profile), date label, city, `ReactionDisplay`, note button
- Swipe left/right triggers `post_reactions` upsert
- After all cards swiped: shows `FollowingOverview` (grid of followed users with latest post thumbnails)
- Empty state: today's prompt text + "Find people" button → `/search`

### Friends Feed (`/friends-feed` → `src/pages/FriendsFeed.tsx`)
- Dedicated full-screen card stack view (same data source as Following tab)
- Back button (ArrowLeft), "Today's Item" header
- After stack exhausted: transitions to `FollowingOverview` component

---

## 4. Reaction System

### Swipe Reactions (`src/components/SwipeReaction.tsx`)
- Wraps content (images) to detect swipe gestures
- 4-directional swipe mapping (configurable via `useReactionConfig`):
  - Default: up=🔥 Fire, down=🌊 Calm, left=🤔 Hmm, right=❤️ Love
- Threshold: 55px displacement to register, max drag: 130px
- Visual feedback: emoji + label overlay with animation preset (pop/slide/stamp/ripple/glow)
- Haptic feedback via `navigator.vibrate([10])` on commit
- Current reaction shown as badge (top-right corner, 28px circle)
- **Two modes**:
  - `longPressMode=true` (feed): requires 180ms long-press before drag activates; pulsing ring indicator
  - `longPressMode=false` (detail): immediate drag detection
- Content translates/scales during drag with clamped offset
- Commit animation: 600ms large emoji overlay (`animate-reaction-commit`)

### Card Stack (`src/components/CardStack.tsx`)
- Generic `CardStack<T extends CardItem>` component
- Tinder-style stacked cards with left/right swipe only
- Stack depth: 2 visible behind top card (each scaled down 4%, offset 8px vertically)
- Rotation during drag: `dx * 0.12` degrees
- Fly-off animation: 340ms to edge of screen with rotation
- Spring-back: 400ms with `cubic-bezier(0.34, 1.56, 0.64, 1)` bounce
- Velocity threshold: 0.4 for quick flicks
- **Swipe hint**: Shows once per session (localStorage `card_stack_hint_seen`), "← 🤔 Swipe to react ❤️ →"
- **Legend**: Persistent below stack showing left/right emoji+label + card counter ("3 / 12")
- Commit animation: large emoji overlay (64px, scale animation)
- `onSwipe(item, direction)` callback + `onEmpty()` when stack depleted

### Reaction Display (`src/components/ReactionDisplay.tsx`)
- Shows aggregated reaction counts for a post (emoji + count for each type)
- Compact mode available for feed cards

### Horizontal Reaction (`src/components/HorizontalReaction.tsx`)
- Alternative horizontal reaction bar UI

### Reaction Settings (`/settings/reactions` → `src/pages/ReactionSettings.tsx`)
- Mode toggle: "4 Directions" vs "4 Corners"
- Per-direction customization: choose reaction type and animation preset from dropdown
- Live preview sandbox with `SwipeReaction` wrapping a sample image
- Save persists to `user_reaction_config` table (upsert by user_id)

### Reaction Config Hook (`src/hooks/use-reaction-config.tsx`)
- `useReactionConfig()`: loads user's custom config from Supabase, falls back to defaults
- Provides: `getReactionForDirection(dir)`, `getAnimationForDirection(dir)`, `config`, `loading`
- Types: `DirectionKey = 'up' | 'down' | 'left' | 'right'`
- `AnimationPreset = 'pop' | 'slide' | 'stamp' | 'ripple' | 'glow'`

### Rate Limiting
- 30 reactions per 5 minutes (DB trigger `enforce_rate_limit_reaction`)
- Self-reaction prevention (DB trigger `prevent_self_reaction`)
- Friendly "Slow down" toast via `mapErrorToUserMessage()`

---

## 5. Social Features

### Appreciations (Likes)
- `AppreciateButton` (`src/components/AppreciateButton.tsx`): Heart icon toggle with count
- Optimistic UI with rollback on error
- On appreciate: inserts `appreciations` row + `activity` row (type: "appreciation") + triggers push notification via `send-notification` edge function
- `AppreciatorsModal` (`src/components/AppreciatorsModal.tsx`): Lists users who appreciated a post with avatars, clickable to profile
- Rate limited: 30 per 5 minutes (DB trigger `enforce_rate_limit_appreciation`)

### Private Notes
- `NoteComposer` (`src/components/NoteComposer.tsx`): Drawer UI (vaul), 140-character limit, textarea + "Send" button
- On send: inserts `private_notes` row + `activity` row (type: "note") + push notification
- Rate limited: 15 per 5 minutes (DB trigger `enforce_rate_limit_note`)
- `NoteThread` (`/notes/:postId` → `src/pages/NoteThread.tsx`): 
  - iMessage-style chat bubbles
  - Own messages: right-aligned, primary color background, white text
  - Received: left-aligned, card background
  - Fixed bottom composer with rounded input, send button (ArrowUp icon), character counter
  - Shows post image thumbnail at top

### Follow System
- `FollowButton` (`src/components/FollowButton.tsx`):
  - Not following → "Follow" (primary) or "Request" (if private account)
  - Pending → "Requested" (disabled outline)
  - Accepted → "Following" (outline, click shows "Unfollow" destructive)
- On follow: inserts `follows` row (status: "accepted" for public, "pending" for private) + `activity` row + push notification
- Rate limited: 20 per 5 minutes (DB trigger `enforce_rate_limit_follow`)
- `FollowList` (`/user/:userId/:type` → `src/pages/FollowList.tsx`):
  - Paginated list with pull-to-refresh (`usePullToRefresh`) + infinite scroll
  - Own followers page shows pending requests section with Accept (Check icon) / Decline (X icon) buttons
  - Each row: avatar (40px), display name, @username, FollowButton (for non-self users)

### User Search (`/search` → `src/pages/Search.tsx`)
- Back button + search input with Search (magnifying glass) icon
- Debounced search (300ms) on `username` and `display_name` via `ilike('%query%')`
- No query → shows "Suggested" label + latest 10 profiles
- Results: avatar (40px), display name (bold), @username (muted), `FollowButton`
- Skeleton loaders (3 rows) during search
- Empty: "No users found" with SearchX icon

---

## 6. Profile & User Views

### Own Profile (`/profile` → `src/pages/Profile.tsx`)
- Header: avatar (64px), display name (xl bold), @username (muted), bio
- Settings gear icon (top-right) → navigates to `/settings`
- Stats row: total posts count, followers count, following count — each clickable → `/user/:id/followers` or `/user/:id/following`
- Streak display: Flame icon + current streak + longest streak badge + grace indicator (Zap icon if grace_used)
- "Joined {date}" with Calendar icon
- Archive button (Archive icon + "Archive") → `/archive`
- **Last 7 days grid**: 7 columns showing each of last 7 dates:
  - Day label (Mon/Tue/etc), date number
  - If posted: image thumbnail (48px square, rounded)
  - If not: dashed border placeholder
  - Continuity dots connecting consecutive posted days
- **Loading state**: Full skeleton with pulse animations matching layout (avatar circle, text bars, stats boxes, 7-column grid)

### User Profile (`/user/:userId` → `src/pages/UserProfile.tsx`)
- Same visual layout as own profile
- Top bar: back button (ArrowLeft) + `ReportBlockMenu` (three dots)
- `FollowButton` instead of settings gear
- Privacy gate: if `is_private && !isFollowing`, shows Lock icon + "This account is private" + "Follow to see their posts"
- Self-view: redirects to `/profile`
- Shows stats, streak, 7-day grid only if viewable (public or following)

### Post Detail (`/post/:postId` → `src/pages/PostDetail.tsx`)
- Sticky header: back arrow (ArrowLeft), "Post" title (center), close X (top-right)
- Image wrapped in `SwipeReaction` (swipe any direction to react)
- "Add a note?" floating prompt appears for 3 seconds after first reaction (animated opacity)
- User info row: avatar (32px), display_name + @username (clickable → user profile), `ReportBlockMenu`
- Actions row: `AppreciateButton`, note button (MessageSquare → NoteComposer drawer), share placeholder
- `ReactionDisplay` below image
- Footer: date/time (format: "MMM d, yyyy · h:mm a"), city with MapPin icon
- Delete button (Trash2 icon): own posts only, soft-deletes via `deleted_at = now()`

---

## 7. Settings

### Settings Page (`/settings` → `src/pages/SettingsPage.tsx`)
- Back button header
- **Profile section**: `AvatarUpload` component, display name input, bio textarea (max 150)
- **Toggles section**:
  - "Private account" (Lock icon) — Switch component
  - "Dark mode" (Moon icon) — Switch, toggles `useTheme().setTheme()` between "light"/"dark"
- **Save button**: Updates `profiles` table (display_name, bio, is_private), calls `refreshProfile()`
- **Notifications section** (only shown if `pushSupported`):
  - "Push notifications" toggle (subscribe/unsubscribe via `useNotifications` hook)
  - If subscribed, shows:
    - "Daily reminder" toggle
    - Reminder time: hour picker (Select component, 12 options: 6AM-5PM local, stored as UTC)
    - "Appreciation alerts" toggle
    - "New follower alerts" toggle  
    - "Note alerts" toggle
- **Links section**: 
  - "Reaction style" → `/settings/reactions`
  - "Terms of Service" → `/terms`
  - "Privacy Policy" → `/privacy`
  - "Install App" → `/install`
- **Sign out button** (outline variant): calls `signOut()`, navigates to `/auth`
- **Delete account**: Red text button → AlertDialog confirmation ("This will permanently delete your account and all your data") → calls `supabase.functions.invoke("delete-account")` → sign out → navigate `/auth`

---

## 8. Notifications

### Web Push Architecture
- Service worker: `public/push-sw.js` — handles push events, shows notification, handles click (opens URL from notification data)
- VAPID key management: `push-subscribe` edge function generates ECDSA P-256 key pair, stores in `app_config` table (key: "vapid")

### Push Subscribe (`supabase/functions/push-subscribe/index.ts`)
- GET: returns `{ publicKey: base64 VAPID public key }`
- POST `{ action: "subscribe", subscription }`: upserts `push_subscriptions` row + ensures `notification_preferences` row exists
- POST `{ action: "unsubscribe", subscription }`: deletes `push_subscriptions` row by endpoint

### Send Notification (`supabase/functions/send-notification/index.ts`)
- Authenticated endpoint, accepts: `{ targetUserId, type, title, body, url }`
- Checks user's `notification_preferences` for the notification type
- Loads VAPID config from `app_config`
- For each user's `push_subscriptions`: encrypts payload (RFC 8291 ECDH + AES-128-GCM), sends via Web Push protocol
- Removes expired subscriptions (410/404 responses)

### Daily Reminder (`supabase/functions/daily-reminder/index.ts`)
- Hourly cron job (no auth required, uses service role key)
- Finds users where `notification_preferences.daily_reminder = true` AND `reminder_hour = currentHourUTC`
- Excludes users who already have a confirmed post for today's `daily_item_id`
- Sends push via `send-notification` function for each eligible user

### Notification Types & Activity
| Type | Trigger | Activity row type | Push title | Push body |
|------|---------|-------------------|------------|-----------|
| Daily reminder | Cron | N/A | "Today's Item" | Prompt text |
| Appreciation | AppreciateButton | "appreciation" | "{username} appreciated" | "your photo" |
| Follow | FollowButton | "follow" / "follow_request" | "{username} followed you" | — |
| Note | NoteComposer | "note" | "{username} sent a note" | Note content |

### Notifications Hook (`src/hooks/use-notifications.ts`)
- `useNotifications()` returns: `supported`, `permission`, `subscribed`, `loading`, `prefs`, `prefsLoaded`, `subscribe()`, `unsubscribe()`, `updatePreferences()`
- Manages browser push permission + subscription state
- Syncs preferences to/from `notification_preferences` table

### Realtime Activity Badge (`src/components/AppShell.tsx`)
- Subscribes to Supabase realtime channel `activity-realtime` for `postgres_changes` INSERT on `activity` table filtered by `user_id=eq.${user.id}`
- Increments `unreadCount` state on each new activity
- Badge shown on Bell icon in bottom nav (red circle, "99+" cap)
- Activity page (`src/pages/Activity.tsx`) updates `profiles.last_seen_activity` to reset count

### Notification Utility (`src/lib/notify.ts`)
- `sendPushNotification({ userId, type, title, body, url })`: invokes `send-notification` edge function with auth header

---

## 9. Content Moderation & Safety

### Report/Block (`src/components/ReportBlockMenu.tsx`)
- Dropdown menu triggered by MoreHorizontal (three dots) icon button
- **Report**: Dialog with reason textarea, inserts into `reports` table
- **Block**: Confirmation AlertDialog → inserts into `blocked_users` table
- Duplicate block handling (Postgres error 23505 → "User already blocked" toast)
- `onBlocked` callback: parent navigates away from blocked content
- Integrated on: PostDetail page (header), UserProfile page (header)

### RLS Enforcement
- `can_view_post(p_post_id, p_viewer_id)` function:
  - Hides deleted posts
  - Unconfirmed posts visible only to owner
  - Own posts always visible
  - Following + accepted: visible for 10 days
  - Public accounts: today's posts visible to all
  - Private accounts: only followers see posts
- Blocked users filtered via `blocked_users` table checks in application code

---

## 10. Activity Feed (`/activity` → `src/pages/Activity.tsx`)
- Header: "Activity" title
- Lists activity items: actor avatar, description text, relative timestamp
- Groups by type: appreciation, follow, follow_request, follow_accepted, note
- On mount: updates `profiles.last_seen_activity = now()` to clear unread badge
- Pull-to-refresh support
- Loading: spinner; Empty: "No activity yet" with Bell icon

---

## 11. Archive (`/archive` → `src/pages/Archive.tsx`)
- Back button header
- Displays last 14 daily prompts grouped by week
- Each card: prompt text (serif italic), formatted date, category emoji mapping:
  - color→🎨, object→📦, human→👤, perspective→👁, emotion→💛, time→⏳, contrast→◐, environment→🌿
- Badges: depth level (1-4), tone (concrete/interpretive/reflective)
- Loading: 3 skeleton cards with pulse
- Empty: "No prompts yet." with Archive icon

---

## 12. PWA / Install (`/install` → `src/pages/Install.tsx`)
- Detects `beforeinstallprompt` event → shows native install button (Chrome/Android)
- iOS detection → shows Safari share sheet instructions with step-by-step
- Already installed (`display-mode: standalone`) → shows checkmark + "Already installed"
- Fallback for unsupported browsers

---

## 13. Navigation & Layout

### App Shell (`src/components/AppShell.tsx`)
- Wraps protected routes via `<Outlet />`
- Bottom navigation bar (fixed, z-50): 4 tabs
  - Capture (Camera icon) → `/`
  - Explore (Compass icon) → `/explore`
  - Activity (Bell icon + unread badge) → `/activity`
  - Profile (User icon) → `/profile`
- Active tab: `text-primary`, strokeWidth 2.4; inactive: `text-muted-foreground`, strokeWidth 1.6
- Background: `bg-card/95 backdrop-blur-xl`, top border
- Safe area: `h-[env(safe-area-inset-bottom)]` padding for iOS home indicator
- Main content: `pb-[72px]` to account for nav height

### Route Structure (React Router v6, `src/App.tsx`)
```
Public (no auth):
  /auth              → Auth.tsx
  /reset-password    → ResetPassword.tsx
  /terms             → Terms.tsx
  /privacy           → Privacy.tsx
  /install           → Install.tsx

Gated (auth required, no shell):
  /onboarding        → Onboarding.tsx

Protected + AppShell:
  /                  → Capture.tsx (Index.tsx redirects)
  /explore           → Explore.tsx
  /activity          → Activity.tsx
  /profile           → Profile.tsx

Protected (no shell):
  /settings          → SettingsPage.tsx
  /settings/reactions → ReactionSettings.tsx
  /search            → Search.tsx
  /user/:userId      → UserProfile.tsx
  /user/:userId/:type → FollowList.tsx
  /notes/:postId     → NoteThread.tsx
  /post/:postId      → PostDetail.tsx
  /archive           → Archive.tsx
  /friends-feed      → FriendsFeed.tsx

Catch-all:
  *                  → NotFound.tsx
```

---

## 14. Shared UI Patterns

### Loading States
- **Page spinner**: `h-5 w-5 border-2 border-border border-t-transparent rounded-full animate-spin` centered in full height
- **Skeleton cards**: `bg-muted animate-pulse rounded-xl` with height matching content layout
- **Profile skeleton**: Avatar circle + text bars + stats boxes + 7-column grid, all with pulse

### Empty States
- Centered layout: icon (muted, 48px) + serif heading + muted description paragraph
- Examples: "No activity yet" (Bell), "No users found" (SearchX), "No prompts yet" (Archive)

### Animations (defined in `tailwind.config.ts`)
- `animate-fade-in`: opacity 0→1, 400ms
- `animate-scale-in`: scale 0.95→1 + opacity, 300ms
- `animate-delayed-fade-in`: same as fade-in but with 600ms delay
- `animate-reaction-commit`: scale 0→1.2→1 + opacity, 600ms
- Spring-back: `cubic-bezier(0.34, 1.56, 0.64, 1)`

### Interactive Feedback
- `tap-scale` class: `active:scale-[0.97]` with 120ms transition
- `transition-ritual`: custom transition timing for smooth state changes

### Typography
- Serif (`font-serif`): headings, prompts, empty state titles
- Sans-serif (default): body text, labels, buttons
- `text-meta`: 11-12px muted secondary info (timestamps, labels)

### Cards & Surfaces
- `surface-card`: card background with subtle border and shadow
- `shadow-soft`: light ambient shadow
- `shadow-card`: stronger card elevation shadow
- `rounded-xl` borders standard

### Toasts
- Sonner library (`sonner`): `toast.success()`, `toast.error()`
- Auto-dismiss, stacked at top

### Pull to Refresh (`src/hooks/use-pull-to-refresh.tsx`)
- Custom touch handlers, detects downward pull on scrolled-to-top container
- Circular spinner indicator during refresh
- Calls async refresh callback

### Infinite Scroll (`src/hooks/use-infinite-scroll.tsx`)
- Intersection Observer on sentinel element at list bottom
- Triggers `loadMore` callback when sentinel enters viewport
- Debounced to prevent rapid firing

### Error Boundary (`src/components/ErrorBoundary.tsx`)
- React class component wrapping entire app
- Catches render errors, shows friendly fallback: "Something went wrong" + "Reload" button

---

## 15. Database Schema

### Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `profiles` | id (= auth.users.id), username, display_name, avatar_url, bio, is_private, onboarding_completed, last_seen_activity | User profiles |
| `daily_items` | active_date, prompt_text, category, depth_level, tone, week_number | Daily photo prompts |
| `posts` | user_id, daily_item_id, image_url, city, confirmed_at, deleted_at | User photos |
| `appreciations` | user_id, post_id | Likes/hearts |
| `post_reactions` | user_id, post_id, reaction_type (up/down/left/right) | Swipe reactions |
| `private_notes` | author_id, post_id, content (140 char) | Direct messages on posts |
| `follows` | follower_id, following_id, status (pending/accepted) | Social graph |
| `activity` | user_id, actor_id, type, reference_id | Notification feed |
| `streaks` | user_id, current_streak, longest_streak, last_posted_date, grace_used | Posting streaks |
| `push_subscriptions` | user_id, endpoint, p256dh, auth | Web push endpoints |
| `notification_preferences` | user_id, daily_reminder, reminder_hour, on_appreciation, on_follow, on_note | Push prefs |
| `user_reaction_config` | user_id, mode, mapping (JSON), animation_preset_mapping (JSON) | Custom reactions |
| `reports` | reporter_id, reported_user_id, reported_post_id, reason | Content reports |
| `blocked_users` | blocker_id, blocked_id | Block relationships |
| `app_config` | key, value (JSON) | App-wide settings (VAPID keys) |

### Key Database Functions
- `can_view_post(post_id, viewer_id)` → boolean: RLS helper for post visibility
- `is_following(follower_id, following_id)` → boolean: checks accepted follow
- `has_posted_today(user_id)` → boolean: checks confirmed post for today
- `check_rate_limit(user_id, action, table, max_count, window_minutes)` → boolean
- `handle_new_user()` → trigger: creates profile + streak on signup
- `update_streak_on_post()` → trigger: updates streak on post confirm (with 1-day grace period)
- `prevent_self_reaction()` → trigger: blocks reacting to own posts
- Rate limit triggers: `enforce_rate_limit_reaction`, `enforce_rate_limit_appreciation`, `enforce_rate_limit_follow`, `enforce_rate_limit_note`

### Storage Buckets
- `post-images` (public): user photo uploads, path: `{userId}/{timestamp}.jpg`
- `avatars` (public): profile pictures

---

## 16. Edge Functions (`supabase/functions/`)

| Function | Auth | Purpose |
|----------|------|---------|
| `generate-daily-items` | JWT required | Creates prompts from categorized library, 35-day buffer |
| `reverse-geocode` | JWT required | Converts lat/lng to city name |
| `push-subscribe` | JWT required | VAPID key exchange + subscription CRUD |
| `send-notification` | JWT required | RFC 8291 encrypted web push delivery |
| `daily-reminder` | Service role | Hourly cron: reminds eligible users who haven't posted |
| `delete-account` | JWT required | Cascading deletion: all user data + storage + auth |

---

## 17. Error Handling (`src/lib/error-utils.ts`)

`mapErrorToUserMessage(error)` maps errors to friendly strings:
- Rate limit errors → "You're doing that too fast. Wait a moment."
- Auth errors → specific messages (invalid credentials, email taken, etc.)
- Network errors → "Check your connection and try again."
- Postgres 23505 (unique violation) → "This already exists."
- Default → "Something went wrong. Please try again."

Used in: AppreciateButton, FollowButton, NoteComposer, ReportBlockMenu, Auth page, Capture page, all interactive flows.

---

## 18. Key Utilities

- `src/lib/image-utils.ts`: `compressImage(file, maxWidth, quality)` — canvas-based JPEG compression
- `src/lib/geolocation.ts`: `getCurrentPosition()` — Promise wrapper for Geolocation API
- `src/lib/notify.ts`: `sendPushNotification()` — edge function invocation helper
- `src/lib/utils.ts`: `cn()` — Tailwind class merger (clsx + tailwind-merge)
- `src/lib/feed-anim-config.ts`: Animation configuration constants for feed transitions

---

## 19. Legal Pages
- `/terms` → `src/pages/Terms.tsx`: Terms of Service
- `/privacy` → `src/pages/Privacy.tsx`: Privacy Policy

---

## 20. File Structure Overview

```
src/
├── App.tsx                    # Root: providers + routing
├── main.tsx                   # Entry point
├── index.css                  # Design tokens (HSL), dark mode, utility classes
├── components/
│   ├── AppShell.tsx           # Bottom nav + layout wrapper
│   ├── AppreciateButton.tsx   # Heart toggle + count
│   ├── AppreciatorsModal.tsx  # List of users who liked
│   ├── AvatarUpload.tsx       # Profile pic upload
│   ├── CardStack.tsx          # Tinder-style swipeable card stack
│   ├── DailyImmersion.tsx     # Full-screen daily prompt overlay
│   ├── ErrorBoundary.tsx      # Global error catch
│   ├── FollowButton.tsx       # Follow/Request/Following toggle
│   ├── FollowingFeedTab.tsx   # Friends feed card stack
│   ├── FollowingOverview.tsx  # Grid of followed users
│   ├── HorizontalReaction.tsx # Horizontal reaction bar
│   ├── NavLink.tsx            # Navigation link helper
│   ├── NoteComposer.tsx       # Drawer for sending notes
│   ├── PhotoFeedPager.tsx     # Photo feed pagination
│   ├── ReactionDisplay.tsx    # Aggregated reaction counts
│   ├── ReportBlockMenu.tsx    # Report/block dropdown
│   ├── RitualAvatar.tsx       # Styled avatar component
│   ├── SwipeReaction.tsx      # 4-direction swipe gesture handler
│   └── ui/                    # shadcn/ui components (button, input, dialog, etc.)
├── hooks/
│   ├── use-infinite-scroll.tsx
│   ├── use-mobile.tsx
│   ├── use-notifications.ts
│   ├── use-pull-to-refresh.tsx
│   ├── use-reaction-config.tsx
│   └── use-toast.ts
├── lib/
│   ├── auth-context.tsx       # AuthProvider + useAuth hook
│   ├── error-utils.ts         # Error → user message mapping
│   ├── feed-anim-config.ts    # Feed animation constants
│   ├── geolocation.ts         # Geolocation wrapper
│   ├── image-utils.ts         # Image compression
│   ├── notify.ts              # Push notification helper
│   └── utils.ts               # cn() class merger
├── pages/
│   ├── Activity.tsx
│   ├── Archive.tsx
│   ├── Auth.tsx
│   ├── Capture.tsx
│   ├── Explore.tsx
│   ├── FollowList.tsx
│   ├── FriendsFeed.tsx
│   ├── Index.tsx
│   ├── Install.tsx
│   ├── NotFound.tsx
│   ├── NoteThread.tsx
│   ├── Onboarding.tsx
│   ├── PostDetail.tsx
│   ├── Privacy.tsx
│   ├── Profile.tsx
│   ├── ReactionSettings.tsx
│   ├── ResetPassword.tsx
│   ├── Search.tsx
│   ├── SettingsPage.tsx
│   ├── Terms.tsx
│   └── UserProfile.tsx
└── integrations/supabase/
    ├── client.ts              # Auto-generated Supabase client (DO NOT EDIT)
    └── types.ts               # Auto-generated DB types (DO NOT EDIT)

supabase/
├── config.toml
└── functions/
    ├── daily-reminder/index.ts
    ├── delete-account/index.ts
    ├── generate-daily-items/index.ts
    ├── push-subscribe/index.ts
    ├── reverse-geocode/index.ts
    └── send-notification/index.ts

public/
├── push-sw.js                 # Service worker for push notifications
├── offline.html
└── robots.txt
```
