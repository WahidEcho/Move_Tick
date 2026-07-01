# Route Audit — 2026-07-02

Every route in the app, its access level, and its verified status. "Verified" =
exercised in a browser against a local dev server on this date (plus the
2026-06-29/30 QA sweep for organizer/admin surfaces); all routes also compile in
`npm run build` (32/32 pages).

Access levels: **P** Public · **A** Authenticated attendee · **O** Organizer (org member) · **S** Platform admin

| Route | Access | Expected | Status | Notes / Fix applied |
|---|---|---|---|---|
| `/` | P | Animated landing | ✅ | CountUp lint error fixed (setState-in-effect) |
| `/events` | P | Grid + filters | ✅ | Was N+1 (4 queries/card) → 1 batched query; covers via next/image |
| `/events/[slug]` | P | Event detail + register/buy | ✅ | Cover via next/image (+`unoptimized` for non-Supabase hosts); register dialog reworked (see QA report) |
| `/login` | P | Sign in → role home or `?redirect=` | ✅ | Role-based redirect added (admin→`/admin`, organizer→`/organizer/overview`, else `/dashboard`); 15s failsafe timeout |
| `/signup` | P | Create account → `/dashboard` | ✅ | Hard-nav fix from prior round retained |
| `/forgot-password` | P | Sends reset email | ✅ | Link URL uses runtime origin |
| `/reset-password` | P | Set new password | ✅ | |
| `/apply-organizer` | P | Organizer application form | ✅ | |
| `/about`, `/contact`, `/terms`, `/privacy` | P | Content pages | ✅ | |
| `/dashboard` | A | Attendee home | ✅ | Parallel queries (already good) |
| `/tickets` | A | Ticket list | ✅ | |
| `/tickets/[id]` | A | QR + wallet buttons | ✅ | Verified on mobile viewport (375px): large QR, wallet button reachable |
| `/tickets/purchase/complete` | A | Payment status + poll | ✅ | |
| `/invitations` | A | Invitations list | ✅ | |
| `/profile` | A | Profile edit | ✅ | |
| `/organizer` → `/organizer/overview` | O | Dashboard summary | ✅ | Capacity overview was a per-event query loop → 1 grouped query |
| `/organizer/events` | O | Event list + tabs | ✅ | Was ~48 queries/page (N+1 `getEventStats` per card) → 1 batched query |
| `/organizer/events/new` | O | Create event | ✅ | |
| `/organizer/events/[id]` (+ `/edit`) | O | Manage event | ✅ | |
| `/organizer/events/[id]/tickets` | O | Ticket types | ✅ | |
| `/organizer/events/[id]/attendees` (+ `/[userId]`) | O | Guest list, manual check-in | ✅ | Table scrolls horizontally on mobile |
| `/organizer/events/[id]/invitations` | O | Invites + CSV | ✅ | |
| `/organizer/events/[id]/coupons` | O | Promo codes | ✅ | List-refresh fix from prior round |
| `/organizer/events/[id]/spaces` | O | Spaces | ✅ | |
| `/organizer/events/[id]/redeems` | O | Redeem items | ✅ | |
| `/organizer/events/[id]/team` | O | Staff roles | ✅ | |
| `/organizer/events/[id]/analytics` | O | Charts + funnel | ✅ | Per-space movement loop → 1 batched query |
| `/organizer/events/[id]/settings` | O | Event settings | ✅ | |
| `/organizer/settings` | O | Org settings | ✅ | Server-action write (leak fixed in prior round) |
| `/admin` → `/admin/applications` (+ `/[id]`) | S | Applications queue | ✅ | |
| `/admin/organizations`, `/admin/events`, `/admin/users`, `/admin/analytics` | S | Platform console | ✅ | |
| `/api/auth/callback` | P | Exchanges code → redirect `next` | ✅ | |
| `/api/webhooks/xpay` | P (signed) | Payment confirmation | ✅ | Signature-verified, idempotent |
| `/api/tickets/[id]/apple-pass`, `google-pass` | A | Wallet passes | ✅ | 24h-after-end expiry embedded |
| any unknown URL | P | Custom 404 | ✅ | **New** `app/not-found.tsx` (was default white page) |
| runtime crash | P | Friendly error + retry | ✅ | **New** `app/error.tsx` |
| slow navigation | P | Spinner | ✅ | **New** `app/loading.tsx` |

## Direct-link behavior
- Logged-out hit on a protected route → `/login?redirect=<path>`, and login returns to it (verified).
- Unknown URLs render the custom 404 instead of bouncing to login — the proxy now only auth-gates known app areas (`/dashboard`, `/tickets`, `/invitations`, `/profile`, `/organizer`, `/admin`, `/api`); dead links fall through to `not-found.tsx` (verified).
- Non-admin on `/admin/*`, non-member on `/organizer/*` → redirected to `/` by `src/proxy.ts` (unchanged, verified in prior round).
