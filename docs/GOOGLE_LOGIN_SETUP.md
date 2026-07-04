# Google Login — 10-minute setup (Mohamed)

The code side is done: "Continue with Google" buttons are live on `/login` and
`/signup`, the auth callback already exchanges the OAuth code, and the profile
trigger now reads Google's `name`/`avatar_url`. The buttons will show an error
until you complete these two dashboard steps.

## Step 1 — Google Cloud Console (~7 min)

1. Go to https://console.cloud.google.com/ → select (or create) a project,
   e.g. **Move-Tick**.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - App name: `Move-Tick` · Support email: `info@mbeg.org` (or yours).
   - Authorized domains: add `mbeg.org` and `supabase.co`.
   - Save through the remaining screens (scopes/test users: defaults are fine),
     then **Publish app**.
3. **APIs & Services → Credentials → + Create credentials → OAuth client ID**:
   - Application type: **Web application**, name `Move-Tick Web`.
   - Authorized JavaScript origins:
     - `https://move-tick.mbeg.org`
     - `http://localhost:3000`
   - **Authorized redirect URIs** (this one is critical — exactly):
     - `https://rqsfqwortwdpskfylidr.supabase.co/auth/v1/callback`
   - Create → copy the **Client ID** and **Client secret**.

## Step 2 — Supabase dashboard (~2 min)

1. https://supabase.com/dashboard → project **Move_Ticket** →
   **Authentication → Sign In / Providers → Google**.
2. Toggle **Enable**, paste the Client ID + Client secret, Save.

## Done — test it

Open https://move-tick.mbeg.org/login → "Continue with Google" → pick your
Google account → you should land signed-in on the dashboard with your Google
name and photo on your profile.

## Good to know

- **Same email = same account.** If someone already has a password account with
  their Gmail address (email confirmed), signing in with Google links to that
  same user — tickets, registrations, and roles are all preserved.
- New Google sign-ups get a profile automatically (name + avatar from Google);
  they never see the password form, but can still set one later via
  "Forgot password".
- Nothing else to configure in Vercel — the flow runs through Supabase.
