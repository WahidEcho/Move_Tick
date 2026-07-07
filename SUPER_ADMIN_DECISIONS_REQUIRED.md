# Super Admin Control Center — Decisions Required

This is the business-decision interview from the Round 5 brief. Four questions
were answered up front (marked ✅) and shaped the whole build; everything else
below is either a genuine open question or a confirm-this-is-right check on a
default I picked while building. None of these block what's already shipped —
they're about what to build/adjust next.

---

## 1. Event Expiry

- ✅ **Buffer**: global platform setting, default 2 hours (`platform_settings.event_expiry_buffer_hours`, editable at `/admin/settings`).
- ✅ **Timezone**: Africa/Cairo is the platform default (display only — the buffer math itself is timezone-safe since it compares absolute instants).
- ✅ **Direct links**: a direct `/events/{slug}` link also 404s for expired events (no bypass) once you're not the owner/staff/admin.
- **Open**: Right now the buffer is one global number for every organization. Do you want a **per-organization override** later (e.g. a sports league that wants a 24h buffer vs. a meetup that wants 1h)? Not built — would be a small addition to the `organizations` table if wanted.
- **Open**: Should organizers get an email/notification when one of *their* events crosses the expiry threshold (a "your event just came down" heads-up), or is silent removal fine?

## 2. Organization Approval

- ✅ Built: approve / reject / request-more-info, each sending the applicant an email + in-app notification + audit log entry, plus an admin-alert email to the internal inbox.
- **Open**: Is manual review required for *every* application forever, or do you want an auto-approve path later (e.g. applications from a pre-vetted email domain, or after N successful events)? `platform_settings.org_approval_required` exists as a toggle but currently only gates messaging/expectations, not an actual auto-approve flow — nothing auto-approves today.
- **Open**: When an application is rejected, should the applicant be able to re-apply immediately, or is there a cooldown? Right now there's no restriction — they can submit a new application any time.
- **Open**: "Request more info" currently has no dedicated resubmission form — the applicant sees the request on `/apply-organizer` and would need to contact support or resubmit fresh. Do you want a proper "edit and resubmit" flow?

## 3. Organizer Limits

- ✅ Built and enforced server-side: `max_events`, `max_published_events`, `can_create_paid`, `requires_publish_approval`, per organization, editable at `/admin/organizations`.
- **Open**: What should the **default** limits be for a newly-approved organization? Right now new orgs get `null` (unlimited) for both max-events fields, `can_create_paid = true`, `requires_publish_approval = false`. `platform_settings.default_max_events` exists but isn't yet applied automatically at approval time — happy to wire that in if you want a real default (e.g. "start every new org at 5 events, no paid tickets, until they've run one successfully").
- **Open**: Should limits scale with anything (e.g. organizations that have completed events without incident get limits raised automatically), or is it always a manual admin adjustment?

## 4. Suspension / Hold

- ✅ Built: suspend / hold / reactivate, each notifies the org's members + alerts the admin inbox, audit-logged.
- ✅ Built: per-org `hide_events_on_suspend` toggle — when on, suspending/holding the org also hides its live events; deleting (soft-delete) an org always hides its events unconditionally.
- **Open**: When an org is suspended/on-hold, should its team members also **immediately lose access** to the organizer portal (can't even view their past data), or should they just be blocked from *creating/publishing new* events (current behavior — org-limits.ts blocks create/publish, but they can still view existing data)?
- **Open**: Is there a difference in practice between "suspended" and "on hold" for you, or are they meant to be used interchangeably depending on tone (e.g. "on hold" = temporary/friendly, "suspended" = punitive)? Right now they behave identically except for the label and notification wording.

## 5. Fees & Contracts

- ✅ **Revenue**: scaffold only. Commission % and fixed fee (EGP) are stored per-platform-default and per-organization-override, shown in the admin dashboard/settings, but **not yet deducted at checkout** — XPay's checkout math is unchanged this round.
- **Open**: When you're ready to make commission real, does it get deducted from the organizer's payout, added on top for the attendee, or split? This determines whether XPay checkout needs to change or just the payout/reconciliation side.
- ✅ **DocuSign**: scaffold only (table + service stubs + placeholder UI). Needs the actual contract template before any real integration work starts — see `docs/DOCUSIGN_SETUP.md`.
- **Open**: Is a signed contract a **hard requirement** before an org can go live (i.e. should `requires_publish_approval`-style blocking apply until `contract_status = 'completed'`), or is it a parallel paperwork process that doesn't gate the product?

## 6. Super Admin Controls

- ✅ Built: full CRUD on events/organizations/users, audit log, email log, platform settings, a plain-English permission matrix (`src/lib/permissions.ts`).
- **Open**: Do you want a **second admin tier** (e.g. "support admin" who can view everything and message users but can't suspend orgs or change platform settings), or is "admin" always full-power for now? Everything today is a single `admin` role with no gradation.
- **Open**: Audit log retention — keep forever, or should old entries eventually be archived/exported and pruned? No retention policy exists yet (the table just grows).
- **Open**: Should destructive actions (archive org/event, disable user) ever require a **second admin's confirmation** (four-eyes principle), or is a single admin's reason-logged action sufficient? Currently a single admin can do anything alone.

## 7. Analytics

- ✅ Built: date range, organization, event, status (published/draft/cancelled), and paid/free filters on `/admin/analytics`, plus a real registrations-over-time chart.
- **Open**: Beyond registrations, do you want revenue-over-time, conversion-rate (views → registrations), or average-ticket-price charts? The dashboard's "Top events by revenue" list exists but there's no time-series revenue chart yet.
- **Open**: Is there a KPI you check regularly that isn't represented anywhere yet (e.g. check-in rate on event day, no-show rate, repeat-attendee rate)?

## 8. Commission & Transactions

- ✅ Built (2026-07-07): per-event commission (event custom > organization override > platform default), full
  gross/fees/net-profit calculation from real payments, a super-admin Transactions page
  (`/admin/transactions`), manual payout recording with proof-of-payment upload, an auto-generated
  settlement statement (PDF + email) sent only after a payout is recorded, and an organizer-facing
  Settlements view (`/organizer/settlements`, own org only).
- **Open**: What should the platform **default commission %** actually be? Right now `platform_settings.commission_percentage` holds whatever was seeded in Round 5 — confirm the real number before launch.
- **Open**: Does the **10 EGP fixed fee always apply** to every paid ticket, or should some organizers/events be fee-free? Built: it applies by default from `platform_settings.fixed_fee_egp`, but an admin can disable or override it per event via the "Set commission" dialog.
- ✅ **Admin can change commission per event**: built — the Event > Organization > Platform hierarchy, with an explicit per-event override and lock toggle at `/admin/transactions`.
- **Open**: Should commission be computed **before or after refunds**? Built: after — `gross_ticket_revenue` only sums `paid`-status payments; refunded amounts are excluded from the commission base entirely (shown separately as `refund_amount` for transparency).
- **Open**: Should commission be computed **before or after payment gateway fees**? Not applicable yet — XPay doesn't expose a fee breakdown anywhere in the current integration, so `payment_gateway_fees` stays null/"not available" and commission is computed on the full ticket price. Revisit once (if) gateway-fee data becomes available.
- **Open**: Should organizer **net profit include or exclude VAT**? Currently excludes — no tax data is tracked (`taxes_amount` stays null/"not available"). Decide if/when Egyptian VAT should be modeled.
- **Open**: **Document naming** — the brief used "invoice" and "statement" somewhat interchangeably. Built using "Settlement Statement" as the customer-facing name (email subject, PDF filename) while keeping "invoice number" (`MT-INV-{YYYY}-{0001}`) as the built-in reference id. Confirm this naming is right, or if "receipt" should replace either term.
- ✅ **Partial payments allowed**: built — `partially_paid` status, a running `remaining_amount_due`, and multiple payout records per settlement.
- **Open**: Should organizers see the **live calculation before any payment is sent**, or only once an admin has recorded the first payout? Currently: a settlement only appears in `/organizer/settlements` once it has at least one paid/refunded payment, but the breakdown itself is visible immediately at that point — before any payout has actually been recorded. Confirm this is the right visibility line, given the constraint that statements themselves must never send early.
- **Open**: Should organizers be able to **confirm receipt of a payout in-platform**? Not built — they get an in-app notification + email when a statement is sent, but there's no "mark as received" action.
- ✅ **Unique invoice numbers**: built — a Postgres sequence (`settlement_invoice_seq`) issues `MT-INV-{YYYY}-{0001}`; one per payout, reused (not incremented) on resend.
- ✅ **PDF downloadable**: built — both the admin and organizer views can regenerate/download the statement PDF at any time.
- ✅ **Resend capability**: built — admin "Resend statement" action, logged as `resent` in the invoice log.
- **Open**: Should **setting a custom commission require a reason** (like suspend/archive actions do elsewhere, via `ReasonDialog`)? Not currently enforced — an admin can enable/edit a custom commission with no reason recorded beyond the automatic audit-log diff.
- **Open**: Should commission **auto-lock once ticket sales begin**, rather than relying on an admin to manually flip the "Lock commission" toggle? Built: a manual `is_locked` field an admin sets themselves; it does not automatically lock at `paid_ticket_count > 0`.

---

## Not blocking, but worth flagging while we're here
- **Security**: rotate the `admin@movebeyond.com` password — it was pasted in plaintext in chat during this round's brief. Never store/commit it anywhere; this file intentionally does not repeat it.
- **DocuSign**: send the contract template whenever it's ready and we'll wire up the real flow (table + services are ready to receive it).
