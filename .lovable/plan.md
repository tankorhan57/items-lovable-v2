

## What's Missing for a Publish-Ready Social Media App

After reviewing the full codebase, here's an audit of gaps across **security, UX polish, legal, and reliability** categories.

---

### 1. Password Reset Flow (Critical)
**Status**: Missing entirely. No "Forgot password?" link on Auth page, no `/reset-password` route.
**Plan**: Add a "Forgot password?" link to Auth.tsx that calls `supabase.auth.resetPasswordForEmail()`, and create a `/reset-password` page that handles the recovery token and calls `updateUser({ password })`.

### 2. Account Deletion / Data Export (Legal/GDPR)
**Status**: No way for users to delete their account or request data export.
**Plan**: Add "Delete account" button in Settings that calls `supabase.functions.invoke("delete-account")`, plus an edge function that cascades deletion across all user tables (`posts`, `follows`, `activity`, `appreciations`, etc.) and removes storage files.

### 3. Content Reporting / Blocking
**Status**: No way to report inappropriate content or block users.
**Plan**: Add a report button on posts/profiles, create a `reports` table, and add a `blocked_users` table with RLS that filters blocked users from feeds and search results.

### 4. Terms of Service & Privacy Policy Pages
**Status**: No legal pages exist. Required for any app store or public launch.
**Plan**: Create `/terms` and `/privacy` static pages, link them from the Auth page footer and Settings.

### 5. OG Image / Social Sharing Meta
**Status**: `index.html` still uses the default Lovable OG image (`lovable.dev/opengraph-image-p98pqg.png`) and `@Lovable` Twitter handle.
**Plan**: Replace with app-specific OG image and metadata.

### 6. Email Confirmation UX
**Status**: After signup, user sees "Check your email" toast but stays on the auth page with no further guidance. No resend option.
**Plan**: Show a dedicated "Check your inbox" screen with a "Resend email" button.

### 7. Error Boundaries
**Status**: No React error boundary. A crash in any component takes down the whole app.
**Plan**: Add a top-level `<ErrorBoundary>` component with a friendly fallback UI and "Reload" button.

### 8. Loading / Empty States Consistency
**Status**: Some pages have skeleton loaders (Activity), others may not handle edge cases well.
**Plan**: Audit all pages for consistent loading, empty, and error states.

### 9. Rate Limit UX Feedback
**Status**: Rate limit triggers raise Postgres exceptions, but the client likely shows a generic error.
**Plan**: Catch rate-limit errors in `mapErrorToUserMessage` and show user-friendly "Slow down" messages.

### 10. Accessibility (a11y)
**Status**: Some interactive elements use raw `<button>` without ARIA labels; images may lack alt text.
**Plan**: Add `aria-label` to icon-only buttons, `alt` text to post images, and ensure keyboard navigation works on key flows.

---

### Priority Ranking for Launch

| Priority | Item | Effort |
|----------|------|--------|
| **P0** | Password reset flow | Small |
| **P0** | Terms & Privacy pages | Small |
| **P0** | OG image / meta update | Tiny |
| **P1** | Account deletion | Medium |
| **P1** | Error boundary | Small |
| **P1** | Report / block users | Medium |
| **P1** | Email confirmation UX | Small |
| **P2** | Rate limit UX feedback | Small |
| **P2** | Accessibility pass | Medium |
| **P2** | Loading states audit | Small |

I'd recommend tackling these in P0 → P1 → P2 order. Want me to start with the password reset flow and legal pages?

