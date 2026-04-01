
# Growth & Engagement Features

## 1. Web Share Button
- Add native share using Web Share API on PostDetail and UserProfile pages
- Fallback: copy link to clipboard on unsupported browsers
- Share data: post image URL, prompt text, and app link

## 2. Streak Recovery UX
- Show grace period status clearly on Profile page (e.g. "1 grace day remaining" or "Grace used")
- Add streak milestone badges at 7, 30, 100 days on profile
- Show encouraging message when streak is at risk (missed yesterday, grace available)
- Display milestone celebration toast when hitting 7/30/100

## 3. Onboarding Follow Suggestions
- Add a new step to onboarding (after avatar, before "Begin") showing 5-6 suggested users to follow
- Query recent active users with public profiles who have posted recently
- Allow bulk-follow with checkboxes, "Follow all" option
- Skip option available

## 4. Invite Friends Flow
- Create an `invites` table with unique invite codes linked to the inviting user
- Add "Invite Friends" button on Profile page and Settings
- Generate shareable invite link using Web Share API
- On signup with invite code: auto-create mutual follow between inviter and invitee
- Create edge function to handle invite redemption after signup
