

# Items — Complete Feature & UI Reference Document

## App Overview

**Items** is a daily photo-sharing social media PWA. Each day, a single prompt appears. Users capture one photo in response, then unlock a global feed of how others interpreted the same prompt. The app emphasizes intentionality, consistency, and calm social interaction.

**Tech Stack**: React 18, Vite 5, TypeScript 5, Tailwind CSS v3, Supabase (auth, database, storage, edge functions, realtime), React Query, next-themes, date-fns, sonner (toasts), lucide-react (icons).

---

## 1. Authentication & Onboarding

### Auth Page (`/auth`)
- **Modes**: `login`, `signup`, `forgot`, `check-inbox`
- **Login**: Email + password fields, "Sign in" button, "Forgot password?" link below
- **Signup**: Username + email + password fields. Username is lowercased, spaces replaced with underscores. Checks for duplicate usernames via `profiles` table before calling `supabase.auth.signUp()`. Passes `username` in `options.data` metadata. Requires email confirmation (not auto-confirmed)
- **Forgot Password**: Email field only, calls `supabase.auth.resetPasswordForEmail()` with redirect to `/reset-password`
- **Check Inbox**: Shows after signup or forgot-password. Displays email address, "Resend email" button (calls `supabase.auth.resend()`), "Back to sign in" link
- **Footer**: Links to `/terms` and `/privacy`
- **UI**: Centered card, serif heading "Items.", subtitle "One prompt. One photo. A shared moment."

### Reset Password (`/reset-password`)
- Listens for `PASSWORD_RECOVERY` event via `supabase.auth.onAuthStateChange()`
- Shows spinner until recovery token is detected
- Form: two password fields (new + confirm), min 6 chars
- Calls `supabase.auth.updateUser({ password })`
- On success: toast + navigate to `/`

### Onboarding (`/onboarding`)
- 4-step flow (3 info slides + avatar upload)
- Slides: "One photo a day" (Camera icon), "Unlock the world" (Globe icon), "Build your ritual" (Flame icon)
- Avatar step: uses `AvatarUpload` component
- Progress dots at bottom, "Next"/"Begin" buttons
- On complete: sets `profiles.onboarding_completed = true`

### Auth Context (`AuthProvider`)
- Wraps entire app, provides: `session`, `user`, `profile`, `loading`, `signOut()`, `refreshProfile()`
- Profile type matches `profiles` table schema
- `ProtectedRoute` component: redirects to `/auth` if unauthenticated, to `/onboarding` if not completed

---

## 2. Core Daily Ritual

### Daily Immersion (`DailyImmersion` component)
- Full-screen overlay shown once per day (tracked via `sessionStorage` key `immersion_seen`)
- Displays today's prompt in large serif italic text
- Camera icon + "Begin" button with delayed fade-in animation
- On dismiss: stores today's UTC date in sessionStorage

### Capture Page (`/` — home route)
- **States**: No prompt | Immersion | Photo selection | Preview + confirm | Confirmed
- Loads today's `daily_items` row, checks if user already posted
- **Photo selection**: Full-height dashed border area, "Tap to capture" with Camera icon. Opens native file picker (`accept="image/*" capture="environment"`)
- **File validation**: Max 10MB
- **Geolocation**: Requests position on file select, calls `reverse-geocode` edge function for city name
- **Preview**: Shows image at 63vh height, "Retake" (outline) and "Confirm" buttons
- **Confirm flow**: Compresses image to 1200px/80% quality, uploads to `post-images` storage bucket as `{userId}/{timestamp}.jpg`, inserts `posts` row with `confirmed_at`
- **Confirmed screen**: Shows image, prompt quote, city name, community count ("{N} people seeing this today"), streak count

### Daily Items Generation (`generate-daily-items` edge function)
- Generates prompts with 35-day buffer
- Distribution: 70% concrete (depth 1-2), 20% grounded, 10% reflective (max 1/week)
- Categories: color, object, human, perspective, emotion, time, contrast, environment
- Stores: `prompt_text`, `category`, `depth_level`, `tone`, `week_number`, `active_date`

---

## 3. Explore / Discovery

### Explore Page (`/explore`)
- **Two tabs**: "World" (global feed) and "Following" (friends feed)
- Tab pills at top, sticky header
- **Gate**: "Following" tab requires user to have posted today (checked via `has_posted_today` RPC)

#### World Tab
- Shows today's prompt at top
- Vertical feed of posts from all users today
- Each post card: image, user avatar + name + username, city, time
- Action column on each post: Appreciate (heart toggle), Note (message icon), Follow (+ icon → checkmark)
- Infinite scroll with cursor-based pagination on `confirmed_at`
- `AppreciatorsModal` and `NoteComposer` modals

#### Following Tab (`FollowingFeedTab` component)
- Loads accepted follows, fetches last 10 days of posts from followed users
- Renders as `CardStack` (Tinder-style swipeable cards)
- Card overlay: username, date label, city, `ReactionDisplay`, note button
- After all cards swiped: shows `FollowingOverview` (grid of followed users with latest posts)
- Empty state: prompt text + "Find people" button linking to `/search`

### Friends Feed (`/friends-feed`)
- Full-screen card stack view (same data as Following tab but dedicated page)
- Back button, "Today's Item" header
- After stack exhausted: transitions to `FollowingOverview`

---

## 4. Reaction System

### Swipe Reactions (`SwipeReaction` component)
- Used on PostDetail and feed cards
- 4-directional swipe: up (🔥 Fire), down (🌊 Calm), left (🤔 Hmm), right (❤️ Love)
- Threshold: 55px displacement to register
- Visual feedback: emoji + label overlay with animation preset (pop/slide/stamp/ripple/glow)
- Haptic feedback via `navigator.vibrate()`
- Current reaction shown as badge (top-right corner)
- Two modes: immediate drag (detail view) or long-press then drag (feed)
- Content subtly translates/scales during drag

### Card Stack (`CardStack` component)
- Tinder-style stacked cards with left/right swipe only
- Stack depth: 2 cards visible behind top card (scaled down 4% each, offset 8px)
- Rotation during drag (0.12 factor)
- Fly-off animation: 340ms to edge of screen
- Spring-back: 400ms with bounce easing
- Velocity threshold: 0.4 for quick flicks
- **Swipe hint**: Shows once per session on first card load ("← 🤔 Swipe to react ❤️ →")
- **Legend**: Persistent below stack showing left/right reactions + card counter (e.g., "3 / 12")
- Commit animation: large emoji overlay on successful swipe

### Reaction Display (`ReactionDisplay` component)
- Shows aggregated reaction counts for a post
- Compact mode for feed cards

### Reaction Settings (`/settings/reactions`)
- Mode toggle: "4 Directions" vs "4 Corners"
- Per-direction: choose reaction type (🔥/🌊/🤔/❤️) and animation preset
- Live preview sandbox with `SwipeReaction` component
- Save persists to `user_reaction_config` table

### Rate Limiting
- 30 reactions per 5 minutes (database-level)
- Friendly "Slow down" error messages via `mapErrorToUserMessage()`

---

## 5. Social Features

### Appreciations (Likes)
- `AppreciateButton`: Heart icon toggle, count display
- Optimistic UI with rollback on error
- Creates `activity` row + triggers push notification on appreciate
- `AppreciatorsModal`: Lists users who appreciated a post with avatars, clickable to profile

### Private Notes
- `NoteComposer`: Drawer UI, 140-character limit, textarea + "Send" button
- Creates `private_notes` row + `activity` row + push notification
- `NoteThread` (`/notes/:postId`): iMessage-style chat bubbles, own messages right-aligned (primary color), received left-aligned (card bg)
- Fixed bottom composer with rounded input, send button, character counter

### Follow System
- `FollowButton`: States — "Follow"/"Request" (primary), "Requested" (disabled outline), "Following" (outline, click to unfollow)
- Private accounts: follow creates `status: "pending"`, public accounts: `status: "accepted"`
- Activity + push notification on follow/request
- `FollowList` (`/user/:userId/:type`): Paginated list with pull-to-refresh + infinite scroll
- Own followers page shows pending requests section with Accept/Decline buttons

### User Search (`/search`)
- Back button + search input with magnifying glass icon
- Debounced search (300ms) on username and display_name via `ilike`
- Shows "Suggested" users (latest 10) when no query
- Each result row: avatar, display name, @username, `FollowButton`
- Skeleton loaders during search

---

## 6. Profile & User Views

### Own Profile (`/profile`)
- Header: avatar, display name, @username, bio
- Settings gear icon → `/settings`
- Stats row: total posts, followers count, following count (clickable → `/user/:id/followers` or `/user/:id/following`)
- Streak display: current streak + longest streak + grace indicator
- "Joined" date
- Archive button → `/archive`
- **Last 7 days grid**: 7 columns showing each day, image thumbnail if posted, placeholder if not, continuity line connecting days
- Loading state: full skeleton with pulse animations matching layout

### User Profile (`/user/:userId`)
- Same layout as own profile but with `FollowButton` + `ReportBlockMenu` instead of settings
- Privacy: if account is private and not following, shows lock icon + "This account is private"
- Self-view redirects to `/profile`
- Stats, streak, and 7-day grid (only shown if viewable)

### Post Detail (`/post/:postId`)
- Sticky header: back arrow, "Post" title, close X
- Image with `SwipeReaction` wrapper (swipe to react)
- "Add a note?" prompt appears for 3 seconds after reacting
- User info: avatar, name, @username (clickable → user profile)
- Actions: `AppreciateButton`, note button (MessageSquare), `ReportBlockMenu`
- `ReactionDisplay` showing all reactions
- Footer: date/time, city, delete button (trash icon, own posts only — soft delete via `deleted_at`)

---

## 7. Settings

### Settings Page (`/settings`)
- **Profile editing**: Avatar upload, display name, bio inputs, private account toggle
- **Save button**: Updates `profiles` table
- **Theme toggle**: Light/dark mode via next-themes
- **Notifications section** (conditional on push support):
  - Push notifications toggle (subscribe/unsubscribe)
  - Reminder time selector (hour picker, converts local↔UTC)
  - Granular toggles: daily reminder, on appreciation, on follow, on note
- **Links**: Reaction settings, Terms, Privacy, Install page
- **Sign out button**
- **Delete account**: AlertDialog confirmation → calls `delete-account` edge function → signs out → navigates to `/auth`

---

## 8. Notifications

### Web Push Architecture
- Service worker: `public/push-sw.js`
- VAPID key exchange via `push-subscribe` edge function (GET for public key, POST for subscribe/unsubscribe)
- Subscription stored in `push_subscriptions` table (endpoint, p256dh, auth keys)
- `send-notification` edge function: RFC 8291 encrypted push delivery
- `daily-reminder` edge function: Hourly cron, targets users who haven't posted today based on `reminder_hour`

### Notification Types
- Daily prompt reminder
- New appreciation
- New follower / follow request
- New private note

### Preferences (`notification_preferences` table)
- Per-user: `daily_reminder`, `reminder_hour`, `on_appreciation`, `on_follow`, `on_note`

### Realtime Activity Badge
- `AppShell` subscribes to Supabase realtime channel for `activity` table INSERT events filtered by `user_id`
- Unread count badge on Activity nav tab (red circle, "99+" cap)
- Count resets when Activity page marks `last_seen_activity` on profile

---

## 9. Content Moderation & Safety

### Report/Block (`ReportBlockMenu` component)
- Dropdown menu (three dots icon): "Report" and "Block user" options
- Report: inserts into `reports` table (reporter_id, reported_user_id, reported_post_id, reason)
- Block: confirmation AlertDialog → inserts into `blocked_users` table
- Duplicate block handling (23505 error → "User already blocked")
- `onBlocked` callback navigates away from blocked content
- Integrated on: PostDetail page, UserProfile page

### RLS Enforcement
- `can_view_post()` function filters blocked users from post visibility
- Block affects: post feeds, search results, profile access

---

## 10. Archive (`/archive`)
- Displays last 14 daily prompts grouped by week
- Each card: prompt text (serif italic), date, category emoji (🎨📦👤👁💛⏳◐🌿), depth level badge, tone badge
- Loading: skeleton cards with pulse
- Empty: "No prompts yet."

---

## 11. PWA / Install (`/install`)
- Detects `beforeinstallprompt` event for Chrome/Android
- iOS detection with Safari share instructions
- Already installed state with checkmark
- Standalone mode detection via `display-mode: standalone` media query

---

## 12. Navigation & Layout

### App Shell (`AppShell`)
- Bottom navigation bar: Capture (Camera), Explore (Compass), Activity (Bell + badge), Profile (User)
- Fixed bottom, blurred card background, safe area padding for iOS home indicator
- Active tab: primary color, bolder stroke
- `<Outlet />` renders child routes

### Routing (React Router v6)
- **Public**: `/auth`, `/reset-password`, `/terms`, `/privacy`, `/install`
- **Gated (onboarding)**: `/onboarding`
- **Protected + AppShell**: `/` (Capture), `/explore`, `/activity`, `/profile`
- **Protected (no shell)**: `/settings`, `/search`, `/user/:userId`, `/user/:userId/:type`, `/notes/:postId`, `/post/:postId`, `/archive`, `/friends-feed`, `/settings/reactions`

---

## 13. Shared UI Patterns

- **Loading**: Spinner (border-2 circle with border-t-transparent animate-spin) for page loads, skeleton cards with animate-pulse for list loads
- **Empty states**: Centered icon + serif heading + muted description
- **Animations**: `animate-fade-in`, `animate-scale-in`, `animate-delayed-fade-in`, `animate-reaction-commit`, spring-back cubic-bezier(0.34, 1.56, 0.64, 1)
- **Tap feedback**: `tap-scale` class on interactive elements
- **Transitions**: `transition-ritual` custom transition timing
- **Typography**: Serif for headings/prompts, sans for body. `text-meta` for secondary info (11-12px muted)
- **Cards**: `surface-card` class, `shadow-soft`, `shadow-card`, rounded-xl borders
- **Toasts**: Sonner for success/error feedback
- **Pull to refresh**: Custom hook with touch handlers, circular spinner indicator
- **Infinite scroll**: Intersection Observer sentinel element at list bottom
- **Error boundary**: Top-level React error boundary with friendly fallback + "Reload" button

---

## 14. Database Schema Summary

| Table | Purpose |
|-------|---------|
| `profiles` | User info: username, display_name, avatar_url, bio, is_private, onboarding_completed, last_seen_activity |
| `daily_items` | Daily prompts: prompt_text, category, depth_level, tone, active_date |
| `posts` | User photos: image_url, city, confirmed_at, deleted_at (soft delete), links to daily_item_id |
| `appreciations` | Like/heart on posts |
| `post_reactions` | Swipe reactions (reaction_type: up/down/left/right) |
| `private_notes` | 140-char messages on posts |
| `follows` | Social graph with status (pending/accepted) |
| `activity` | Notification feed (types: appreciation, follow, follow_request, follow_accepted, note) |
| `streaks` | current_streak, longest_streak, last_posted_date, grace_used |
| `push_subscriptions` | Web push endpoints + keys |
| `notification_preferences` | Per-user notification toggles + reminder_hour |
| `user_reaction_config` | Custom reaction mappings + animation presets |
| `reports` | Content/user reports |
| `blocked_users` | Block relationships |
| `app_config` | Key-value app settings |

---

## 15. Edge Functions

| Function | Purpose |
|----------|---------|
| `generate-daily-items` | Creates prompts with AI, maintains 35-day buffer |
| `reverse-geocode` | Converts lat/lng to city name |
| `push-subscribe` | VAPID key exchange + subscription management |
| `send-notification` | Delivers encrypted web push messages |
| `daily-reminder` | Hourly cron: reminds users who haven't posted |
| `delete-account` | Cascading user data deletion (all tables + storage + auth) |

---

## 16. Error Handling

- `mapErrorToUserMessage()`: Maps Supabase/Postgres errors to friendly strings (rate limits → "You're doing that too fast", auth errors → specific messages, network → "Check your connection")
- All interactive components (AppreciateButton, FollowButton, NoteComposer, ReportBlockMenu) use this utility
- Optimistic UI with rollback on failure in AppreciateButton and reaction handlers
- Global `ErrorBoundary` wraps entire app with "Something went wrong" fallback + reload button

