# Mobile Status & Plan — 2026-07-02

## What exists
**A dedicated Flutter app** (`../Move_tick_App` — Riverpod + GoRouter +
Supabase), plus a fully responsive mobile web experience on the platform itself.

### Flutter app (phase 1: QR + operations)
- **Attendee:** discover/search events, event detail, My Tickets, **ticket QR**,
  invitations, notifications, profile.
- **Staff/organizer ops:** gate scanner (check-in/out), space scanner, redeem
  scanner, typo-tolerant attendee lookup + manual check-in, event overview.
- Backend contract verified: all queries/RPCs work under RLS with the anon key;
  scan expiry (24h after event end) enforced server-side.

### Fixed this round
- **Event details + ticket screens crashed** (`GoException: no routes for
  location /events/…`): navigation pushed plural paths while routes are
  singular. All fixed (`/event/:id`, `/ticket/:id`), dead "See all" links now
  open `/search`. `flutter analyze`: clean.

### Mobile web (already meets the required flow)
Browse `/` and `/events` and event details **without login**; Register/Buy
prompts sign-in and returns to the same event; ticket QR page is large and
scannable at 375px (verified). Bottom-reachable actions, hamburger nav, tables
scroll horizontally.

## Required flow vs. app today

| Requirement | Mobile web | Flutter app |
|---|---|---|
| Open on Explore, no forced login | ✅ | ❌ forces login at start (`app_router.dart` redirect) |
| Browse event details logged-out | ✅ | ❌ same reason |
| Login prompt only at register/buy, return to event | ✅ | ❌ (no in-app register flow yet) |
| My Tickets + QR | ✅ | ✅ |
| Staff scanning separated from attendee flow | n/a | ✅ (`/ops` gated by role) |

## Plan for the Flutter guest-mode rework (next pass)
1. **Router:** allow `/discover`, `/search`, `/event/:id` unauthenticated;
   keep `/tickets`, `/events` (my events), `/invitations`, `/profile`, `/ops`
   gated. On gated navigation, push `/login?returnTo=<path>` and resume after
   auth.
2. **Data:** discover/detail queries already work with the anon key under RLS —
   no backend change needed.
3. **Register CTA:** wire the existing (currently unreachable)
   `RegistrationScreen` to the event detail screen; if logged out → login sheet
   → continue registration.
4. **Tabs:** Explore / My Tickets / Invitations / Profile; keep Staff Mode
   behind role check as today.
5. Estimated effort: ~1 focused day incl. device testing (see
   `Move_tick_App/TESTING.md` for the run/checklist).
