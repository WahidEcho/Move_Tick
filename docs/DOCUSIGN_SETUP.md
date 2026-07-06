# DocuSign contract integration — setup (scaffold only, not built yet)

This round adds the **database table, service layer, and admin UI placeholder**
for organization contracts — it deliberately does **not** wire up real DocuSign
calls. That work is blocked on Mohamed providing the actual contract template
(the document DocuSign will send for signature, with the fields it should
merge in — organization name, commission %, fixed fee per paid ticket, etc.).

## What exists today
- `contracts` table (migration `20260704_super_admin_foundation.sql`): one row
  per contract attempt, with `contract_status` (`draft → generated → sent →
  viewed → signed → completed`, or `declined`/`expired`/`failed`).
- `src/services/contracts.service.ts`: typed CRUD against that table
  (`createDraftContract`, `updateContractStatus`, `getContractsForOrganization`)
  — no DocuSign API calls anywhere in this file.
- `src/lib/docusign/client.ts`: placeholder module. `getDocuSignConfig()`
  reads the 7 env vars below and returns `null` if any are missing (expected
  right now). `createEnvelope()` and `verifyWebhookSignature()` both throw a
  clear "not implemented" error — nothing calls them yet.
- Admin UI: the organization "View revenue & history" panel shows a
  **"Contract integration pending template"** notice instead of a working
  contract flow.

## What's needed before building the real integration
1. **The contract template itself** — the PDF/Word document to be signed,
   with placeholders for the fields DocuSign should merge in.
2. Which fields are dynamic per organization (name, commission %, fixed fee,
   signer name/email — anything else?).
3. Whether contracts are sent automatically on org approval, or manually
   triggered by an admin.

## The 7 env vars this will need (once building starts)
Get these from a DocuSign developer account (https://developers.docusign.com —
free sandbox account, upgrade to production once tested):

```
DOCUSIGN_INTEGRATION_KEY=      # "Integration Key" (a GUID) from your DocuSign app
DOCUSIGN_USER_ID=              # API Username (GUID) of the account impersonated for JWT auth
DOCUSIGN_ACCOUNT_ID=            # Your DocuSign Account ID (GUID)
DOCUSIGN_PRIVATE_KEY=           # RSA private key (PEM) generated for the integration key, for JWT grant auth
DOCUSIGN_AUTH_SERVER=           # account-d.docusign.com (sandbox) or account.docusign.com (production)
DOCUSIGN_TEMPLATE_ID=           # The DocuSign template ID for the contract, once uploaded
DOCUSIGN_WEBHOOK_SECRET=        # DocuSign Connect's HMAC secret, for verifying incoming status webhooks
```

Put them in `Move-Tick/.env.local` (gitignored) for local dev, and in Vercel's
project env vars for production. Never commit real values.

## Planned flow (not implemented — for reference when building)
1. Admin clicks "Generate contract" for an organization → `createDraftContract()`
   writes a `draft` row → `docusign.createEnvelope()` (JWT auth → envelopes:create
   from `DOCUSIGN_TEMPLATE_ID` with the org's merge fields) → store the returned
   envelope id + signing url, status → `sent`.
2. DocuSign Connect calls a new webhook route (e.g. `/api/webhooks/docusign`)
   on status changes (`viewed`, `signed`, `completed`, `declined`) — verify the
   signature with `verifyWebhookSignature()`, then `updateContractStatus()`.
3. Each transition should fire the matching admin-alert email (the triggers
   for "contract signed/completed" and "DocuSign failures" are already listed
   in the admin-alert trigger set from this round's brief, just not wired to
   real events yet since there are none to react to).
