# Task: Fix Notification Mismatch in Shifts Swap (AI)

## Progress
- [x] Investigate `useSwaps.ts` for notification count logic.
- [x] Investigate `SwapView.tsx` for rendering logic and empty state conditions.
- [x] Identify and fix the discrepancy in `Dashboard.tsx`.
- [x] Replace hardcoded "1" badge with real `swaps.length`.
- [x] Verify no other hardcoded badges exist.

# Task: Roster UX Enhancements (Animations, Banner, Onboarding)
- [x] Create "All employees submitted" banner prompting auto assign.
- [x] Use Local Notifications to alert the boss when everyone submits.
- [x] Animate auto-assign button (glow/pulse) when action recommended.
- [x] Animate publish button (glow/pulse) when all shifts filled.
- [x] Add 3-step graphic onboarding modal triggered by "How it works".
- [x] Update onboarding modal text to clarify WhatsApp submission and CSV export.

# Task: Header Menu Interactions
- [x] Fix positioning bug in `NotificationsTray` causing it to render cropped/off-screen.
- [x] Transform header Avatar into a functional dropdown menu.
- [x] Add standard Profile Dropdown Options (Account Settings, Subscription, Help, Contact, Logout).
