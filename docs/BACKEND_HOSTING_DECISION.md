# Backend Hosting Decision — 2026-07-02

## Current architecture
Next.js 16 (App Router, server components + server actions) on **Vercel**,
**Supabase** (Postgres + Auth + Storage + RLS), Resend for email, XPay for
payments (webhook → `/api/webhooks/xpay`). Auto-deploys from GitHub
`WahidEcho/Move_Tick` on push to `main`; production domain
`https://move-tick.mbeg.org`.

## Bottlenecks found (measured in this audit)
- N+1 query patterns in app code (organizer events page ≈48 queries/render,
  analytics loops) — **fixed in code**.
- A client-side auth deadlock that presented as "the site froze" — **fixed in code**.
- Unoptimized full-resolution images — **fixed with next/image**.
- Database: healthy. 48 covering indexes; no slow-query evidence; Supabase
  advisors show no errors.

None of these were infrastructure limits.

## Options considered
- **A. Keep Vercel + Supabase, fix code (chosen).** All bottlenecks were query
  patterns; serverless + Postgres comfortably covers launch-scale traffic
  (hundreds of concurrent attendees, gate-scan bursts already go through
  SECURITY DEFINER RPCs which are single fast statements).
- **B. Supabase RPC/Edge Functions.** Already used where it matters (scanner
  RPCs, atomic issuance). Add more only if a specific query cluster proves hot.
- **C. Railway Node backend.** Adds an always-on server to build, secure,
  monitor, and pay for — solves nothing we measured. It would help only for:
  long-running background jobs/queues, websockets at scale, or heavy scheduled
  processing. None exist in the launch scope.
- **D. Hybrid.** Premature.

## Recommendation
**Stay on Vercel + Supabase (Option A).** Revisit only if post-launch we add
real background workloads (bulk email campaigns, live occupancy websockets,
scheduled exports). The webhook + email flows are request-scoped and fit
serverless fine.

## What Railway would NOT solve
The reported slowness (N+1 queries, image weight) and the login freeze
(client-side deadlock) live in application code — they'd behave identically on
any host.
