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

# Task: Fix Lint Errors
- [x] Fix unused variables and `any` types across frontend.
- [x] Fix exhaustive hooks react warnings.
- [x] Fix backend `any` types and unused parameters.
- [x] Resolve React Hook rule violations in backend.
- [x] Push all changes to Git.

# Task: PWA Installation Prompt
- [x] Add `manifest.webmanifest` file for PWA configuration.
- [x] Add `vite.config.ts` PWA plugin configuration.
- [x] Implement `beforeinstallprompt` event listener in `App.tsx`.
- [x] Add "Install App" button to the header/profile menu.
- [x] Test PWA installation flow on mobile and desktop.

# Task: Fix Loading UI Crashes & AI WhatsApp Replies
- [x] Wrap `Notification` constructor in `RosterView` in a `try/catch` to fix iOS Safari white-screen crash on "All Submitted".
- [x] Add fallback undefined and `Number.isNaN()` checks to array sorts in `useShifts`, `useSwaps`, `useNegotiations` to prevent rendering crashes.
- [x] Remove overly broad keywords ('כן', 'לא') from `whatsapp.ts` `SHIFT_KEYWORDS` to prevent AI from waking up on random non-shift related employee messages.
- [x] Push all changes to Git.
