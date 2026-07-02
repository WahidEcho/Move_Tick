# Questions / Actions for Belal & Mohamed — 2026-07-02

> **Status update (later same day):** Mohamed confirmed all three items.
> #1 and #2 were applied in the dashboards; #3 was answered "B" and the
> guest-mode + in-app registration work is **built** (see
> `docs/MOBILE_STATUS_AND_PLAN.md`). Kept below for the record.

Only items that need dashboard access or a business decision. Everything else
from the audit brief was fixed directly (see `docs/QA_REPORT.md`).

## 1. Supabase Auth URLs (fixes localhost links in auth emails)

### Area
Supabase dashboard → Authentication → URL Configuration

### What is blocking me
Confirmation/reset/magic-link emails are rendered by Supabase using the
dashboard **Site URL** — if it still points at `http://localhost:3000`, those
emails link to localhost no matter what the code does. This cannot be changed
from the repository.

### Required values
```
Site URL:                 https://move-tick.mbeg.org
Additional Redirect URLs: https://move-tick.mbeg.org/**
                          http://localhost:3000/**
```

### Recommended answer
Set exactly the values above (keep the localhost entry so local dev keeps working).

## 2. Vercel env var scheme

### Area
Vercel dashboard → move-tick-platform → Settings → Environment Variables

### What is blocking me
I corrected `NEXT_PUBLIC_APP_URL` to `https://move-tick.mbeg.org` in the local
env files, but I can't read the value stored in Vercel. If Vercel has `http://`
(or localhost), ticket emails / payment redirects / wallet passes will use it.

### Options
A. Verify it is exactly `https://move-tick.mbeg.org` (all environments) — done in 30s.
B. Leave as-is and rely on the code fallback (works, but the canonical domain should be explicit).

### Recommended answer
A. After changing it, trigger a redeploy (env vars are baked at build time).

## 3. Mobile in-app registration (product decision)

### Area
Mobile / Event Workflow

### What is blocking me
The Flutter app has a complete-but-unreachable registration screen. Phase 1 was
scoped as "attendees show their QR; registration happens on web." The audit
brief's mobile flow (browse → register in app) implies wiring it up.

### Options
A. Keep phase 1 as-is (register on web; app = tickets + scanning) — zero work.
B. Wire in-app registration + guest browsing per `docs/MOBILE_STATUS_AND_PLAN.md` (~1 day).

### Recommended answer
B before public launch if the app ships to attendees; A if the app is
staff/early-adopter only at launch.
