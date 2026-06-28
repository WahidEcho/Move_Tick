# Apple Wallet Pass — Certificate Setup Guide (Move-Tick)

A complete, click-by-click walkthrough to generate the Apple Wallet signing
certificate and wire it into Move-Tick. Every website you need is linked, and
the CSR step (the confusing one) is broken down in full.

**Time:** ~20–30 min · **Cost:** Apple Developer Program $99/yr · **OS:** macOS

When you finish you'll have 6 values to paste into `Move-Tick/.env.local`. A
helper script does the conversion for you at the end.

---

## At a glance — the websites you'll touch

| Page | URL | What you do there |
|------|-----|-------------------|
| Apple Developer | https://developer.apple.com/account | Sign in / enroll |
| Identifiers | https://developer.apple.com/account/resources/identifiers/list/passTypeId | Create the **Pass Type ID** |
| Certificates | https://developer.apple.com/account/resources/certificates/list | Create the **Pass certificate** |
| Membership | https://developer.apple.com/account/#/membership | Copy your **Team ID** |
| Apple WWDR certs | https://www.apple.com/certificateauthority/ | Download the **WWDR G4** cert |

(Keychain Access is a built-in macOS app — no URL.)

---

## Prerequisite — Apple Developer Program membership

You must be **enrolled in the paid Apple Developer Program** ($99/yr). A free
Apple ID cannot create Pass Type certificates.

- Check / enroll: https://developer.apple.com/programs/enroll/
- Verify you're active: https://developer.apple.com/account/#/membership
  (you should see a **Team ID** and an active membership).

---

## Step 1 — Create the Pass Type ID

1. Go to **https://developer.apple.com/account/resources/identifiers/list/passTypeId**
2. Click the blue **(+)** next to "Identifiers".
3. Select **Pass Type IDs** → **Continue**.
4. Fill in:
   - **Description:** `Move-Tick Event Ticket`
   - **Identifier:** `pass.org.mbeg.movetick`
     (must start with `pass.` — reverse-DNS style; you can choose the suffix)
5. **Continue** → **Register**.

✅ **Save this string** — it's your **`APPLE_PASS_TYPE_IDENTIFIER`**.

---

## Step 2 — Generate a CSR in Keychain Access  *(the tricky bit, in detail)*

A CSR ("Certificate Signing Request") is a small file that proves you own a
private key. Apple signs it to produce your certificate. You create it on your
Mac, and your private key stays in your Keychain.

1. Open **Keychain Access**:
   - Press **⌘ + Space**, type **Keychain Access**, hit Return.
   - (Or Finder → Applications → Utilities → Keychain Access.)
2. In the **menu bar at the top of the screen**, click **Keychain Access** (the
   bold app-name menu, immediately right of the Apple logo).
3. Hover **Certificate Assistant** → in the submenu click
   **Request a Certificate From a Certificate Authority…**

   > ⚠️ If "Request a Certificate…" is **greyed out**: click anywhere in the
   > Keychain Access window first so a keychain (e.g. "login") is selected, then
   > reopen the menu. Make sure **no certificate is selected** in the list.

4. In the dialog that appears:
   - **User Email Address:** your email (e.g. `movetick@mbeg.org`)
   - **Common Name:** `Move-Tick Pass`
   - **CA Email Address:** leave **blank**
   - **Request is:** select **Saved to disk**
   - (leave "Let me specify key pair information" unchecked)
5. Click **Continue**, choose a location (e.g. Downloads), **Save**.

✅ You now have **`CertificateSigningRequest.certSigningRequest`** in Downloads.
This also silently created a private key in your Keychain (login → Keys) — leave
it there, you'll need it in Step 4.

---

## Step 3 — Create the Pass certificate (upload the CSR)

1. Go back to **https://developer.apple.com/account/resources/identifiers/list/passTypeId**
2. Click your **`pass.org.mbeg.movetick`** identifier.
3. Find the **Pass Type ID Certificate** section → click **Create Certificate**.
   - (Alternatively: Certificates list → **(+)** →
     **Pass Type ID Certificate** → pick your Pass Type ID.)
4. **Choose File** → select the `.certSigningRequest` from Step 2 → **Continue**.
5. Click **Download** → you get **`pass.cer`** (in Downloads).

---

## Step 4 — Export certificate + private key as a `.p12`

1. In Finder, **double-click `pass.cer`** → it imports into Keychain Access.
2. In Keychain Access, left sidebar: select **login** keychain, then the
   **My Certificates** category.
3. Find the certificate (named like **"Pass Type ID: pass.org.mbeg.movetick"**).
   Click the **▶ triangle** to expand it — you should see a **private key**
   nested underneath. (If there's no key under it, the CSR/key in Step 2 didn't
   match — redo Step 2 on the same Mac.)
4. **Right-click the certificate row** (the one with the key under it) →
   **Export "Pass Type ID: …"**.
5. **File Format:** **Personal Information Exchange (.p12)** → **Save** as
   `pass.p12` (e.g. in Downloads).
6. **Set a password** when prompted and **remember it** — you'll type it once
   into the helper script. (Your Mac login password may also be requested to
   allow the export — that's normal.)

✅ You now have **`pass.p12`** + its password.

---

## Step 5 — Download Apple's WWDR certificate

1. Go to **https://www.apple.com/certificateauthority/**
2. Under "Apple Intermediate Certificates", download
   **Worldwide Developer Relations - G4** (`AppleWWDRCAG4.cer`).

---

## Step 6 — Find your Team ID

1. Go to **https://developer.apple.com/account/#/membership**
2. Copy the **Team ID** (10 characters, e.g. `ABCDE12345`).

✅ This is your **`APPLE_TEAM_IDENTIFIER`**.

---

## Step 7 — Convert + load into `.env.local` (one command)

A script does the PEM conversion and base64 encoding for you:

```bash
cd "/Users/wahid/MW/Side Hustle/Move Beyond/Code Base/MB_Tickting_systeem_code/Move-Tick"

./scripts/apple-wallet-cert-to-env.sh \
  ~/Downloads/pass.p12 \
  ~/Downloads/AppleWWDRCAG4.cer \
  pass.org.mbeg.movetick \
  YOUR_TEAM_ID
```

- It prompts **once** for the `.p12` password (from Step 4).
- It prints a block of `APPLE_*` lines.
- **Copy that whole block into `Move-Tick/.env.local`** (gitignored).

That's everything. The "Add to Apple Wallet" button then appears automatically on
the ticket page and inside ticket emails.

---

## What each env value is (for reference)

| Env var | Source |
|---------|--------|
| `APPLE_PASS_TYPE_IDENTIFIER` | the `pass.…` you registered (Step 1) |
| `APPLE_TEAM_IDENTIFIER` | Team ID (Step 6) |
| `APPLE_PASS_ORG_NAME` | display name — `Move-Tick` |
| `APPLE_PASS_SIGNER_CERT_B64` | from `pass.p12` (script) |
| `APPLE_PASS_SIGNER_KEY_B64` | from `pass.p12` (script) |
| `APPLE_WWDR_CERT_B64` | WWDR G4 cert (Step 5, script) |

---

## Optional — real artwork

Replace the placeholder purple squares in `src/lib/wallet/assets/` with Move-Tick
branding, keeping the same filenames and sizes:
`icon.png` 29×29, `icon@2x.png` 58×58, `logo.png` ~160×50, `logo@2x.png` ~320×100.
Not required for it to work.

---

## Troubleshooting

- **"Request a Certificate…" is greyed out** → click into the Keychain Access
  window (select the *login* keychain), ensure no certificate row is selected,
  then reopen the menu.
- **No private key under the certificate (Step 4)** → you must export on the
  **same Mac** that generated the CSR (the private key lives in that Keychain).
  Redo Steps 2–4 on this machine.
- **`openssl` legacy error** on newer macOS → the script already retries with
  `-legacy`; if it still fails, run the same `openssl pkcs12 … -legacy` commands
  manually.
- **Security** → never commit `pass.p12`, its password, or `.env.local`. The
  script only writes secrets into the gitignored `.env.local`.

---

## Security note

Keep `pass.p12` and its password private. Anyone with the signed certificate can
issue passes that look like yours. Store the `.p12` somewhere safe (password
manager) after setup; the running app only needs the base64 values in
`.env.local`.
