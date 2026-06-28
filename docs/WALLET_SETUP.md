# Apple Wallet & Google Wallet — setup

The code is fully built. Wallet buttons stay hidden and the pass endpoints return
`501` until the env vars below are present, at which point everything turns on
with **no code changes**. The pass barcode encodes the ticket's `qr_token`, so a
scanned wallet pass checks in exactly like the in-app QR.

All secrets go in `Move-Tick/.env.local` (gitignored). Certs/keys are passed as
**base64** strings (multi-line PEM is awkward in env files):
`base64 -i somefile.pem | pbcopy`

---

## Apple Wallet

Requires an **Apple Developer account ($99/yr)**.

1. **Create a Pass Type ID**: developer.apple.com → Certificates, Identifiers &
   Profiles → Identifiers → `+` → *Pass Type IDs*. Use e.g. `pass.org.mbeg.ticket`.
2. **Create a signing certificate** for that Pass Type ID (generate a CSR via
   Keychain Access). Download the `.cer`, then export the **certificate + private
   key** from Keychain as a `.p12`.
3. **Split the .p12** into PEM cert + key:
   ```
   openssl pkcs12 -in pass.p12 -clcerts -nokeys -out signerCert.pem
   openssl pkcs12 -in pass.p12 -nocerts -out signerKey.pem   # set a passphrase
   ```
4. **Apple WWDR cert**: download "Worldwide Developer Relations" (G4) from
   developer.apple.com/certificationauthority, convert to PEM:
   ```
   openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
   ```
5. Add to `.env.local` (values base64-encoded):
   ```
   APPLE_PASS_TYPE_IDENTIFIER=pass.org.mbeg.ticket
   APPLE_TEAM_IDENTIFIER=YOURTEAMID
   APPLE_PASS_ORG_NAME=Move Beyond
   APPLE_PASS_SIGNER_CERT_B64=<base64 of signerCert.pem>
   APPLE_PASS_SIGNER_KEY_B64=<base64 of signerKey.pem>
   APPLE_PASS_SIGNER_KEY_PASSPHRASE=<the passphrase from step 3>
   APPLE_WWDR_CERT_B64=<base64 of wwdr.pem>
   ```
6. Replace the placeholder brand images in `src/lib/wallet/assets/` (`icon.png`,
   `icon@2x.png`, `logo.png`, `logo@2x.png`) with real Move Beyond artwork.

---

## Google Wallet

Requires a **Google Wallet API issuer** account.

1. Apply for issuer access: pay.google.com/business/console → Google Wallet API.
   Note your **Issuer ID**.
2. In Google Cloud Console: enable the **Google Wallet API**, create a **service
   account**, grant it access in the Wallet console, and download its **JSON key**.
3. Add to `.env.local`:
   ```
   GOOGLE_WALLET_ISSUER_ID=3388000000022xxxxxx
   GOOGLE_WALLET_SA_EMAIL=wallet@your-project.iam.gserviceaccount.com
   GOOGLE_WALLET_SA_PRIVATE_KEY_B64=<base64 of the private_key PEM from the JSON>
   # optional: GOOGLE_WALLET_CLASS_SUFFIX=movetick_event_ticket
   ```
   (The `private_key` field inside the JSON is the PEM to base64-encode.)

The EventTicketClass is created automatically by Google on the first "save" —
no separate provisioning call needed.

---

## How it surfaces to users
- **Ticket page** (`/tickets/[id]`): "Add to Apple Wallet" / "Add to Google
  Wallet" buttons appear under the QR once configured.
- **Ticket email**: the same buttons are added under "View your ticket".
- Endpoints: `GET /api/tickets/[id]/apple-pass` (downloads `.pkpass`),
  `GET /api/tickets/[id]/google-pass` (redirects to Google save). Both are
  auth-gated — only the ticket owner (or org member, via RLS) can fetch them.
