# QA Report — full-platform stabilization (2026-07-02)

## Summary
The platform is in good shape: all routes load, auth is deterministic, and the
critical attendee/organizer journeys work end-to-end. This pass found and fixed
one **critical** auth deadlock (the real cause of "login freezes"), removed the
biggest query bottlenecks, simplified free registration to two clicks, and
hardened URLs/error pages.

## Fixed issues

| Area | Issue | Fix | Files changed |
|---|---|---|---|
| **Auth (critical)** | Login (and any auth call) could freeze forever: the `onAuthStateChange` callback awaited a Supabase query while auth-js held its internal `navigator.locks` lock → deadlock held the lock for the whole tab | Callback made synchronous; profile fetch deferred via `setTimeout`; redundant `getSession()` init removed | `src/lib/hooks/use-auth.ts` |
| Auth | Multiple GoTrueClient instances (one per `createClient()` call) contend on the same auth lock | Browser client is now a singleton | `src/lib/supabase-browser.ts` |
| Auth | Login button could stay in loading state forever if the network hung | 15s failsafe timeout unlocks the button with a clear message | `src/app/(public)/login/page.tsx` |
| Auth | After login every user landed on `/dashboard` regardless of role | Role-based destination: admin → `/admin`, org member → `/organizer/overview`, else `/dashboard`; explicit `?redirect=` always wins | `src/app/(public)/login/page.tsx` |
| URLs | Three duplicated `appUrl()` helpers, each silently falling back to `http://localhost:3000` (localhost links in production emails if the env var is missing) | Single `getAppUrl()` helper: env var → `VERCEL_URL` → localhost (dev only), loud error in prod | `src/lib/app-url.ts` (new), `email.service.ts`, `payments.service.ts`, `wallet/google.ts` |
| URLs | `NEXT_PUBLIC_APP_URL` used `http://` (not `https://`) | Corrected in all local env files; **verify the same var in Vercel + Supabase dashboard** (see QUESTIONS_FOR_BELAL.md) | `.env.local*` |
| UX | Free registration required typing name+email into a form **whose values were never used** (registration is account-based server-side) | Two clicks: Register → confirm card showing the signed-in identity → ticket. Logged-out users get a "Sign in to continue" prompt that returns them to the event | `src/app/(public)/events/[slug]/register-dialog.tsx` |
| UX | After free registration the user landed on the ticket *list*, not their ticket | Redirect straight to `/tickets/{id}` (QR visible immediately); hard navigation (router.push+refresh raced and cancelled the transition) | same |
| Routing | No custom 404/error/loading pages (blank default pages) | Added `not-found.tsx`, `error.tsx`, `loading.tsx` | `src/app/` |
| Perf | Organizer events page: N+1 (≈48 queries for 12 cards) | One batched registrations query | `organizer/events/page.tsx`, `events.service.ts` |
| Perf | Public events grid: `getEventStats` per card | One batched confirmed-count query | `events/page.tsx`, `event-card.tsx`, `events.service.ts` |
| Perf | Analytics: per-space and per-event query loops | Batched `.in()` queries | `analytics.service.ts` |
| Perf | Raw `<img>` covers (full-res downloads) | `next/image` with responsive sizes; non-Supabase hosts pass through unoptimized (organizer-pasted URLs can be any host) | `event-card.tsx`, `events/[slug]/page.tsx`, `next.config.ts` |
| Perf | React Query installed + provider mounted but never used | Dependency and provider removed | `src/lib/providers.tsx`, `package.json` |
| Lint | 3 lint errors (impure `Date.now()` in render, setState-in-effect, empty interface) | All fixed; `npm run lint` now has 0 errors | `tickets/[id]/page.tsx`, `landing.tsx`, `organizations.service.ts` |
| Mobile app | Event details + ticket pages crashed with `GoException: no routes for location /events/…` — screens pushed plural paths (`/events/:id`, `/tickets/:id`) but routes are singular; "See all" pushed nonexistent routes | All callers aligned to `/event/:id`, `/ticket/:id`; "See all" → `/search` | `Move_tick_App/lib/presentation/attendee/**` (5 files) |

## Remaining issues

| Area | Issue | Reason not fixed | Required input |
|---|---|---|---|
| Auth emails | Localhost links in Supabase *auth* emails (confirm/reset) come from the Supabase dashboard **Site URL** setting, not code | Dashboard-only setting | See QUESTIONS_FOR_BELAL.md #1 |
| Vercel env | Can't read `NEXT_PUBLIC_APP_URL` value in Vercel from here | Needs dashboard access | See QUESTIONS_FOR_BELAL.md #2 |
| Lint | 69 warnings (unused imports/vars) | Cosmetic; zero runtime impact | None — cleanup opportunity |
| Mobile app | Guest browsing (explore without login) not yet built | Scoped to a later pass per owner decision | See docs/MOBILE_STATUS_AND_PLAN.md |
| Mobile app | Event-detail Register CTA not wired (registration currently happens on web) | Product decision: is in-app registration wanted for phase 1? | Owner call |

## Tested roles
Attendee (throwaway account, deleted after), organizer (throwaway org, deleted after), logged-out visitor. Admin surfaces verified in the 2026-06-29/30 sweep.

## Tested routes
See [ROUTE_AUDIT.md](./ROUTE_AUDIT.md).

## Final recommendation
**Ready for beta.** Production-readiness for the July launch requires: the two
dashboard settings above, key rotation (service-role/Resend/XPay), swapping XPay
test keys → live, and one real-money purchase E2E on the deployed site.
