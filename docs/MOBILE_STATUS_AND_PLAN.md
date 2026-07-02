# Mobile Status & Plan — updated 2026-07-02 (guest mode SHIPPED)

## What exists
**A dedicated Flutter app** (`../Move_tick_App` — Riverpod + GoRouter +
Supabase), plus a fully responsive mobile web experience on the platform itself.

### Flutter app
- **Attendee:** discover/search events **without logging in**, event detail,
  in-app **free-ticket registration** (login prompted only at that point, then
  returns to the event), My Tickets, **ticket QR**, invitations, notifications,
  profile.
- **Staff/organizer ops:** gate scanner (check-in/out), space scanner, redeem
  scanner, typo-tolerant attendee lookup + manual check-in, event overview —
  all gated behind org/staff roles, separate from the attendee flow.

### Guest-mode rework (built 2026-07-02)
| Requirement | Status |
|---|---|
| Open on Explore, no forced login | ✅ splash → `/discover` for everyone |
| Browse event details logged-out | ✅ `/discover`, `/search`, `/event/:id` are guest routes; anon RLS read policies added for **published public events only** (`anon_public_event_browsing` migration) |
| Login prompt only at register / personal screens, return to where you were | ✅ router pushes `/login?returnTo=…`; login/signup resume it (carried across the login↔signup links too) |
| In-app registration | ✅ "Get Tickets" CTA on event detail → ticket-type picker → registers via `POST /api/mobile/register` (Bearer token) — the **same server logic as web**: capacity, approval/waitlist, free-only guard, atomic QR issuance, confirmation email + PDF |
| Paid tickets | ✅ shown with "Purchased securely on the website"; tapping opens the event page in the browser (XPay checkout). The API **rejects paid ticket types** server-side |
| My Tickets + QR | ✅ success screen deep-links to the issued ticket's QR |
| Staff mode separated | ✅ `/ops` role-gated as before |

### Also fixed
- Attendee navigation crashes (plural vs singular routes) — `7027ac3`.
- Post-registration "View My Tickets" pointed at a nonexistent `/tickets` route.
- The old mobile registration was a raw `status='confirmed'` insert — no
  capacity/approval checks and **no ticket ever issued**. Replaced by the API.

## Config
The app reads `WEB_APP_URL` from `.env` (defaults to
`https://move-tick.mbeg.org`) for the registration API and web checkout links.

## Remaining / next
- Device pass: run through `Move_tick_App/TESTING.md` on a real phone
  (guest browse → register → QR → scan).
- Push notifications still stubbed (post-launch).
- Optional later: in-app paid checkout (XPay WebView / deep link back).
