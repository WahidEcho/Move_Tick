# Performance Report — 2026-07-02

## Main bottlenecks found

1. **Organizer events page — N+1 (worst offender).**
   `getEventStats()` was called per event card, and each call ran 4 sequential
   count queries → ~48 round-trips to render 12 cards.
2. **Public events grid — same pattern.** `EventCard` (a server component)
   called `getEventStats` per card.
3. **Analytics service — awaits inside loops.** Per-space movement queries in
   `getEventAnalytics`, per-event registration counts in
   `getOrganizerDashboardSummary`.
4. **Images.** All covers were raw `<img>` at original resolution — a 4K upload
   was shipped to every phone.
5. **Dead client-bundle weight.** React Query provider mounted app-wide but no
   component ever used it.
6. **Auth deadlock** (see QA report) — not "slowness" but experienced as an
   infinite freeze; the single biggest perceived-performance bug.

## Fixes applied

| Fix | Effect |
|---|---|
| Batched registration counts (`getRegistrationCountsByEvent`, `getConfirmedCountsByEvent` in `events.service.ts`) | Organizer events page: ~48 queries → 2. Public grid: 4×N → 1. |
| `getEventStats` internals parallelized (`Promise.all`) | Every remaining caller (event detail, register action) 4× fewer sequential round-trips |
| Analytics loops → single `.in()` queries | Overview + analytics pages scale with 1 query instead of N |
| `next/image` for covers with responsive `sizes` (+ AVIF/WebP via the Vercel optimizer; Supabase Storage host allow-listed in `next.config.ts`; other hosts pass through unoptimized) | Mobile downloads a phone-sized image, not the original |
| Removed `@tanstack/react-query` + its provider | Smaller client JS on every page |

## DB indexes
Audited `supabase/schema.sql`: **48 indexes** already cover every hot path
(events slug/org/status, tickets event/user/qr_token, registrations event/user/
status, movements event/ticket, org members, staff assignments). **No new
indexes needed.**

## Why public pages stay dynamic (no ISR)
The header renders auth state on every page, and event capacity/"spots left"
must be current — so pages are server-rendered per request (standard for this
kind of app). With the query batching above, per-request cost is now a handful
of indexed queries. If the events grid ever becomes a hotspot at scale, the
next lever is ISR for `/events/[slug]` with on-demand revalidation on
registration — not needed at current traffic.

## Remaining risks / future levers
- Framer-motion is limited to the landing page (one file) — acceptable; could be
  code-split later.
- `dev`-mode measurements are misleading (compile time dominates); judge speed on
  the deployed site.
- Cover uploads are unconstrained in size; consider client-side resize on upload
  post-launch.

## Railway / backend recommendation
**No Railway.** See [BACKEND_HOSTING_DECISION.md](./BACKEND_HOSTING_DECISION.md).
Every measured bottleneck was query *patterns* in app code, not infrastructure.
