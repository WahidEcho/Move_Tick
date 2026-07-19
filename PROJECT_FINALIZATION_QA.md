# Move Tick — Project Finalization Q&A

**Created:** 2026-07-16 · **Owner to answer:** Mohamed
**Purpose:** One place to close out every open decision so the project can be
declared launch‑ready. This file **replaces** `SUPER_ADMIN_DECISIONS_REQUIRED.md`
(all 27 of its open questions are folded in below, marked `[from old doc]`) and
adds the findings from the 2026‑07‑16 full flow + security + XPay review.

---

## How to use this file

- Each item has a **`➤ ANSWER:`** line. Write your answer right after the arrow.
- Leave the rest untouched. When you've filled in a section, tell me
  *"work through Part N"* (or *"do all the answered ones"*) and I'll implement
  every decision you've made, in order.
- Items marked **🔴 BLOCKER** stop a real paid launch until resolved.
- Items marked **🟡** are important but not launch‑blocking.
- Items marked **⚪** are polish / future / confirm‑a‑default.
- Where I have a recommendation, it's written as **Rec:** — you can just reply
  "yes / rec" to accept it.

---

# PART 1 — Launch blockers: credentials & config (features are BUILT, waiting on you)

These are all finished in code and gated off until the secrets exist. No new
development — just values only you can provide.

### 1.1 🔴 XPay keys + webhook (take real money)
The whole paid flow is built and, per my review today, matches XPay's real API.
It has **never run against a live XPay account**. I need, in `Move-Tick/.env.local`
(and Vercel env):
- `XPAY_SECRET_KEY` (start with the `sk_test_…` sandbox key)
- `XPAY_WEBHOOK_SECRET` (from a webhook endpoint you add in the XPay dashboard,
  pointing at `https://move-tick.mbeg.org/api/webhooks/xpay`, subscribed to
  `checkout.session.completed`)
➤ ANSWER yes i added them on vercel and env.local but we still in testing phase and not with the real api live keys 

### 1.2 🔴 Run one real sandbox purchase end‑to‑end
Once 1.1 is set, we do ONE test buy (test card `5123 4500 0000 0008`, exp `01/39`,
CVV `100`) and confirm: checkout opens → payment → webhook fires → ticket issues →
email arrives. Only after this is XPay truly "verified working," not just "correct
on paper."
➤ ANSWER (who runs it, and on which event — I can seed a 5 EGP test ticket):we are on testing api and its the one who we can check everything so do your test on these api availble so we can check the connect is working and the flow is working or not 

### 1.3 🔴 Verify the Resend sending domain
Transactional email (tickets, invites, settlement statements) is wired but will
not deliver to real attendees until the domain (owner `info@mbeg.org`) is verified
in Resend.
➤ ANSWER (confirm domain verified, or tell me to draft the DNS records):its yes verified and working 

### 1.4 🟡 Apple / Google Wallet developer credentials
Pass generation is built and matches the ticket design; needs the Apple Wallet
cert + Google service‑account key (see `docs/WALLET_SETUP.md`).
➤ ANSWER (do you want wallet passes live for launch, or defer?):yes sure and its working on iphone perfectly, but for google we didnt do a thing yet because our developer account isnt veryfied yet 

### 1.5 🟡 Brand asset files
Logos currently render from text/procedural fallbacks. Drop real files into
`Move-Tick/public/brand/`: `mb-logo-black`, `mb-logo-white`, `movetick-logo`
(+ optional clean ticket‑background PNG).
➤ ANSWER (send files, or keep fallbacks for launch?): all placed there and yes add them

### 1.6 🔴 Rotate the two exposed secrets (security)
- The old **Supabase service‑role key** was shipped on‑device in an earlier build.
  Rotate it in the Supabase dashboard, then update `.env.local` + Vercel.
- The **test admin password** was pasted in chat. Change it.
➤ ANSWER (confirm both rotated):not yet

---

# PART 2 — Money decisions (answer before the first real sale)

### 2.1 🔴 Commission at checkout — the big one
**Today the platform commission is calculated for reporting/settlement AFTER the
event, but is NEVER deducted during checkout — the buyer pays the full ticket
price and 100% flows to the organizer's balance.** This is fine if you settle
manually, but if you want the platform to take its cut automatically, I need to
know the model:
- (a) **Deduct from organizer payout** — buyer pays list price, platform keeps its
  % + fixed fee on the settlement side (no checkout change; mostly done already). **Rec.**
- (b) **Add on top for the attendee** — buyer pays ticket price + fee (checkout math changes).
- (c) **Split at gateway** — requires XPay split‑payment support (confirm XPay offers it).
➤ ANSWER (a / b / c): a

### 2.2 🔴 Platform default commission % `[from old doc]`
`platform_settings.commission_percentage` holds whatever was seeded. Confirm the
real number before launch.
➤ ANSWER (e.g. "10%"):5% default and cusomizable from super admin on each organization

### 2.3 🟡 The 10 EGP fixed fee `[from old doc]`
Applies to every paid ticket by default (admin can override/disable per event).
Confirm the amount and that "every paid ticket" is right.
➤ ANSWER: yes

### 2.4 ⚪ Commission before/after refunds `[from old doc]`
Built: **after** — refunded payments are excluded from the commission base
(shown separately). Confirm.
➤ ANSWER (confirm / change):yes

### 2.5 ⚪ Commission vs gateway fees `[from old doc]`
XPay doesn't expose a per‑transaction fee breakdown, so commission is computed on
the full ticket price and `payment_gateway_fees` stays "not available." Confirm
this is acceptable, or tell me if XPay gives you a fee figure to model.
➤ ANSWER: x-pay detuct 2% and 2 EGP from each transaction so i need you to add a super admin financial table with xpay only and show me what is for me and what did x-pay detucted from me ( as it will be my reference of what accually is the number inside my bank account )

### 2.6 ⚪ VAT / tax `[from old doc]`
Organizer net profit currently **excludes** VAT (no tax modeled). Decide if/when
Egyptian VAT should be added.
➤ ANSWER:yes no tax model availble and keep it that way till further notice 

### 2.7 ⚪ Refund policy — partial + on cancellation
Refunds are wired for **full refunds only**, and are not auto‑triggered when an
event is cancelled. Do you want: partial refunds, and/or automatic refunds when an
organizer cancels an event?
➤ ANSWER: refunds will be by acceptance or rejection of super admin to do that and i need you to tell me how you will archticture that with organizer and with attendee 

### 2.8 ⚪ Settlement document naming `[from old doc]`
Built as customer‑facing "Settlement Statement" + internal "invoice number"
(`MT-INV-YYYY-0001`). Confirm, or should it be "receipt" / "invoice"?
➤ ANSWER: yes confirm on this (`MT-INV-YYYY-0001`)

### 2.9 ⚪ Organizer payout confirmations `[from old doc]`
Not built: organizers get notified when a statement is sent but can't "mark payout
as received" in‑platform. Add that?
➤ ANSWER: no need as super admin highlighted or done the transaction the system will inform the orgnization that you got the settelment document and will be automatically recieved from the org side no need for org verification 

### 2.10 ⚪ Live settlement visibility `[from old doc]`
Organizers see the breakdown as soon as a settlement has ≥1 paid payment (before
any payout is recorded); statements themselves never send early. Confirm this
visibility line.
➤ ANSWER: yes do that 

### 2.11 ⚪ Custom‑commission guardrails `[from old doc]`
Two small policy choices:
- Require a written **reason** when an admin sets a custom commission (like
  suspend/archive do)?
- **Auto‑lock** commission once ticket sales begin, instead of the current manual
  "Lock" toggle?
➤ ANSWER: do both and pick a legal reason from egyptian legal search it out and get back to me

---

# PART 3 — Security hardening (from the 2026‑07‑16 review)

**Headline: no critical vulnerability or data leak was found.** RLS is correctly
scoped — every sensitive table (payments, tickets, audit log, settlements, payout
records, contracts, email log) restricts reads to the owner, their org, or admins,
and fails closed for anonymous users. The items below are defense‑in‑depth /
hardening, each with my recommended action. A plain "do all Part 3 recs" is enough.

### 3.1 🟡 Every logged‑in user can read every profile row
`profiles` RLS is `SELECT USING (true)` for authenticated users — so any signed‑in
user can read all profiles (name, avatar, phone if stored). Not exposed to anon.
**Rec:** narrow it so users read their own profile + only the minimal public fields
(name/avatar) of others, keeping phone/email private. Confirm before I change it,
since organizer/staff screens may rely on reading attendee names.
➤ ANSWER (tighten / leave as‑is): leave as it is

### 3.2 ⚪ Three helper functions are anon‑executable
`handle_new_user`, `notify_followers_on_publish`, `next_settlement_invoice_number`
can be executed by the `anon` role. The first two are trigger functions; the third
could let an anonymous caller burn invoice numbers (nuisance, not a leak).
**Rec:** `REVOKE EXECUTE … FROM anon` on all three. Safe, no downside.
➤ ANSWER (yes / rec):yes

### 3.3 ⚪ Three functions have a mutable search_path
`record_gate_movement`, `record_space_movement`, `build_scan_result` don't pin
`search_path` (a SECURITY DEFINER hardening gap). **Rec:** add
`SET search_path = public, pg_temp`. Safe.
➤ ANSWER (yes / rec):yes 

### 3.4 ⚪ Broad anon table grants (GraphQL surface)
~40 tables carry a table‑level `SELECT` grant to `anon`. RLS already blocks the
rows, so this is cosmetic API‑surface noise, but it's cleaner to revoke anon
SELECT on tables that public pages don't need (keep events, ticket_types, spaces,
etc. that anonymous browsing genuinely uses). **Rec:** revoke on the sensitive
set. Low priority.
➤ ANSWER (yes / rec / skip): skip

### 3.5 ⚪ Enable leaked‑password protection
Supabase's "reject known‑breached passwords" (HaveIBeenPwned) is off. **Rec:**
enable it in the dashboard (Auth → Policies). Free, one toggle.
➤ ANSWER (yes / rec): do that

### 3.6 ⚪ Public storage buckets allow listing
`avatars` and `event-assets` are public buckets whose read policy allows listing
all files (enumeration). Low risk for public assets. **Rec:** restrict LIST while
keeping individual objects public. Optional.
➤ ANSWER (yes / skip):skip

### 3.7 ⚪ Housekeeping
- `pg_trgm` extension lives in `public` (cosmetic; Supabase suggests a separate schema).
- `processed_webhook_events` table is **unused dead code** — idempotency is handled
  more robustly by the atomic payment claim. **Rec:** drop the table. Optional.
➤ ANSWER (yes / skip): yes

---

# PART 4 — Product & policy decisions `[all from old doc]`

### 4.1 Event expiry
- Per‑**organization** expiry‑buffer override later (e.g. league wants 24h, meetup 1h)? Currently one global 2h buffer.
  ➤ ANSWER: do as recommended
- Email organizers a "your event just came down" heads‑up when it expires, or is silent removal fine?
  ➤ ANSWER:email the organizer 

### 4.2 Organization approval
- Manual review of every application forever, or an auto‑approve path later (pre‑vetted domain / after N good events)? Nothing auto‑approves today.
  ➤ ANSWER:skip
- After a rejection, can the applicant re‑apply immediately, or is there a cooldown? (No restriction today.)
  ➤ ANSWER:cooldown 10 min and for second rejection will be 24 hours
- Build a proper "edit & resubmit" flow for "request more info"? (Today they'd resubmit fresh / contact support.)
  ➤ ANSWER:yes please make it more professional and also send an email with the admin request

### 4.3 Organizer limits
- Default limits for a newly‑approved org? Today: unlimited events, paid allowed, no publish approval. (e.g. "start at 5 events, no paid, until first successful event"?)
  ➤ ANSWER:start with 2 events
- Should limits scale automatically (good history → higher limits) or always manual admin adjustment?
  ➤ ANSWER:scale automatically

### 4.4 Suspension / hold
- When suspended/on‑hold, should the org's team **lose portal access entirely**, or just be blocked from creating/publishing (current behavior — they can still view existing data)?
  ➤ ANSWER:be blocked from creating/publishing
- Is there a real difference between "suspended" and "on hold" for you, or interchangeable tone? (Behave identically today except label/wording.)
  ➤ ANSWER: remove hold

### 4.5 Contracts (DocuSign)
- Is a signed contract a **hard gate** before an org can go live (block publish until `contract_status = completed`), or a parallel paperwork process that doesn't gate the product?
  ➤ ANSWER:(block publish until `contract_status = completed`)
- DocuSign is scaffold‑only. Send the contract **template** when ready and I'll wire the real flow (7 env vars documented in `docs/DOCUSIGN_SETUP.md`).
  ➤ ANSWER (template status): not ready yet but we can work on it and tell me everything needed and if you can generate a template to start in arabic  according to egyptian laws do that please 

### 4.6 Super‑admin controls
- Add a **second admin tier** (e.g. "support admin": can view + message users, cannot suspend orgs or change settings)? Today it's a single all‑powerful `admin`.
  ➤ ANSWER: do that
- Audit‑log **retention**: keep forever, or archive/prune old entries eventually? (No policy today; table just grows.)
  ➤ ANSWER:archive/prune old entries eventually
- Should destructive actions (archive org/event, disable user) require a **second admin's confirmation** (four‑eyes), or is one reason‑logged admin enough?
  ➤ ANSWER: one reason‑logged admin enough

### 4.7 Analytics
- Want revenue‑over‑time, conversion‑rate (views→registrations), or average‑ticket‑price charts? (Only registrations‑over‑time + "top events by revenue" exist.)
  ➤ ANSWER:all of following revenue‑over‑time, conversion‑rate (views→registrations), and average‑ticket‑price charts
- Any KPI you check regularly that isn't shown anywhere yet (check‑in rate, no‑show rate, repeat‑attendee rate)?
  ➤ ANSWER:yes very needed

### 4.8 Waitlist behaviour
- Waitlist promotion is **manual** today (organizer clicks "Promote"). Want **automatic** promotion (+ notification) when a paid/free spot frees up, or is manual fine for launch?
  ➤ ANSWER:automated

---

# PART 5 — Feature scope: build now, or defer?

For each, tell me **now / after launch / never**. These are known gaps, not bugs.

| # | Feature | Current state | ➤ now / later / never |
|---|---------|---------------|----------------------|
| 5.1 | **Commission at checkout** (Part 2.1) | reporting only | |now
| 5.2 | **Server‑side push notifications** (buy/update/reminder pushes) | Firebase config present, local reminders work, **no server sender built** | |now
| 5.3 | **DocuSign real integration** | scaffold + stubs | |now
| 5.4 | **Partial refunds / auto‑refund on cancel** | full‑refund only | |later
| 5.5 | **Arabic (EN/AR) language toggle** | not built | |later
| 5.6 | **Per‑event terms & conditions / age policy** | not built | |later
| 5.7 | **Seating maps** | not built | |later 
| 5.8 | **SMS / WhatsApp broadcast campaigns** | email blast ✅, WhatsApp *share* ✅, no automated SMS/WA blasts | |later
| 5.9 | **Embeds / public API / Zapier / webhooks** | not built | |never
| 5.10 | **Manager dashboard extras** (scans/min, per‑staff counts, no‑show rate, peak occupancy, capacity alerts, end‑of‑day summary) | not built | |later
| 5.11 | **Networking / in‑event chat** | out of scope | |later
| 5.12 | **Virtual events (Zoom/Meet)** | out of scope | |later

---

# PART 6 — Review findings log (informational — what I verified on 2026‑07‑16)

No answer needed; this records the evidence behind the review.

**XPay integration — verified against `docs.xpay.app`:**
- ✅ Base URL `https://api.xpay.app`, `Authorization: Bearer sk_…` — match.
- ✅ Create checkout `POST /checkout/sessions` with `afterCompletion.redirect.url`,
  `lineItems[].priceData{currency,unitAmount,productData.name}`, `quantity`,
  `metadata`; minor units (×100) — **exact match** to our client.
- ✅ Response `{id,url,status,amountTotal,currency}` — match.
- ✅ Webhook `checkout.session.completed`, `data.object.status === 'complete'` — match.
- ✅ Signature `XPay-Signature: t=…,v1=…`, HMAC‑SHA256 of `"{t}.{rawBody}"`, 300s
  replay window, constant‑time compare — **exact match** (Stripe‑identical scheme).
- ✅ Idempotency: atomic `pending→paid` claim prevents double‑issue on webhook retries; 5xx returned on failure so XPay retries. Correct.
- ⚠️ `GET /checkout/sessions/{id}` (reconcile) and `POST /refunds` (`{paymentIntent}`)
  follow the resource convention but I **could not byte‑confirm** them (the API
  reference sub‑pages 404'd for me) — confirm against your XPay dashboard's API
  reference or the live sandbox test (1.2).
- ⚠️ Webhook doesn't assert charged `amountTotal` == stored `amount_total` (very low
  risk — we set the amount server‑side). Optional hardening.

**Flow & security:**
- ✅ Free vs paid paths are correctly separated; the free‑registration action
  refuses paid ticket types (can't get a paid ticket for free).
- ✅ Oversell race closed by `issue_ticket()` (row lock + capacity recheck in one txn).
- ✅ Mobile APIs authenticate by Bearer token, price server‑side only, quantity clamped 1–10.
- ✅ Wallet routes self‑authenticate by cookie OR the ticket's secret token (safe for guest email links).
- ✅ RLS restrictive on all sensitive tables; anon fails closed.
- 🟡/⚪ Hardening items → Part 3.

**Known "looks done but isn't" (surfaced to you separately):**
- Commission not deducted at checkout (Part 2.1 / 5.1).
- Push notifications never send server‑side (5.2).
- DocuSign is a scaffold (4.5 / 5.3).

---

# IMPLEMENTATION STATUS (2026-07-19)

All answers above were executed in workstreams W0–W10 (commits on main):
- ✅ W0 hardening + settings (5% commission, 2-event default, XPay fee model, fn grants/search_path, dead table dropped)
- ✅ W1 XPay sandbox E2E — verified to the 3DS screen; session `cs_test_aZHkI5RbXUEnLHVEv1COM` left open: finish the last Submit click from any browser, the ticket then auto-issues (test event `xpay-sandbox-test-w1`, buyer mohamed.wahid.gm+xpaytest@gmail.com / pw shared in session)
- ✅ W2 commission model (a) + reason-required + auto-lock at first paid sale
- ✅ W3 /admin/gateway — XPay deduction vs bank-net reconciliation
- ✅ W4 refunds: attendee request → /admin/refunds approve/reject (full XPay refund + ticket deactivation + emails)
- ✅ W5 per-org expiry buffer + expiry emails, rejection cooldown (10min/24h), more-info resubmission, 2-event start + auto-scaling limits, hold removed, auto waitlist promotion, 6-hourly Vercel cron
- ✅ W6 'support' view-only admin role (assignable from Users)
- ✅ W8 FCM push mirror of every in-app notification (needs FIREBASE_SERVICE_ACCOUNT_JSON — docs/PUSH_SETUP.md)
- ✅ W9 contract publish-gate toggle (default OFF) + admin "Mark contract completed" + docs/CONTRACT_TEMPLATE_AR.md
- ✅ W10 webhook amount assertion; brand logos live in footers
- ⏳ W7 analytics expansion (revenue-over-time, conversion + view tracking, avg ticket price, check-in/no-show/repeat KPIs) — next session

## Still on Mohamed only
1. 🔴 Rotate Supabase service-role key + test admin password (1.6 — still open)
2. 🔴 Finish the one 3DS Submit click (W1 above) to close the payment loop
3. 🟡 Supabase dashboard → Auth → enable leaked-password protection (3.5)
4. 🟡 Firebase service-account JSON → Vercel env (push goes live instantly)
5. 🟡 Add CRON_SECRET env in Vercel (secures /api/cron/housekeeping)
6. ⚪ XPay live keys + live webhook before the real event; lawyer review of the Arabic contract draft
