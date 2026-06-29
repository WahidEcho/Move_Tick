# Supabase Auth emails → Resend + branding

Goal: auth emails (confirm signup, password reset, magic link) send **from
`movetick@mbeg.org` via Resend** and look like Move-Tick — not default Supabase.
These are Supabase **dashboard** steps (the code side — reset pages, redirects —
is already done).

---

## 1. Point Supabase Auth at Resend SMTP
Supabase Dashboard → **Project Settings → Authentication → SMTP Settings** →
**Enable Custom SMTP**, then:

| Field | Value |
|---|---|
| Sender email | `movetick@mbeg.org` |
| Sender name | `Move-Tick` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your **Resend API key** (`re_...`) |

(`mbeg.org` is already verified in Resend, so sending from `movetick@mbeg.org` works.)

> Also raise **Auth → Rate Limits → "Emails per hour"** if needed — the default is low.

## 2. Redirect URLs
Auth → **URL Configuration**:
- **Site URL:** `https://movetick.mbeg.org`
- **Redirect URLs (allow list):** add
  `https://movetick.mbeg.org/**`, `https://move-tick-platform.vercel.app/**`,
  `http://localhost:3000/**`

## 3. Branded email templates
Auth → **Email Templates**. Paste the HTML below per template. Keep Supabase's
`{{ .ConfirmationURL }}` variable — it already routes through our
`/api/auth/callback` (which we wired to set the session + redirect).

### Confirm signup
```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;padding:24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#07070F;padding:24px 32px"><span style="color:#fff;font-size:20px;font-weight:700">Move-Tick</span></td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 12px;color:#07070F;font-size:22px">Confirm your email</h1>
        <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Welcome to Move-Tick! Tap below to confirm your email and start discovering events.</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#5B3BE8;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px">Confirm email</a>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">If you didn't create an account, you can ignore this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</div>
```

### Reset password
```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;padding:24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#07070F;padding:24px 32px"><span style="color:#fff;font-size:20px;font-weight:700">Move-Tick</span></td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 12px;color:#07070F;font-size:22px">Reset your password</h1>
        <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">We received a request to reset your Move-Tick password. Tap below to choose a new one. This link expires soon.</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#5B3BE8;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px">Reset password</a>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </td></tr>
    </table>
  </td></tr></table>
</div>
```

### Magic Link
```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f3f4f6;padding:24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#07070F;padding:24px 32px"><span style="color:#fff;font-size:20px;font-weight:700">Move-Tick</span></td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 12px;color:#07070F;font-size:22px">Your sign-in link</h1>
        <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Tap below to sign in to Move-Tick.</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#5B3BE8;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:10px">Sign in</a>
      </td></tr>
    </table>
  </td></tr></table>
</div>
```

(Optionally apply the same shell to **Change Email Address** + **Invite user**.)

## 4. Verify
- Trigger a password reset from `/forgot-password` → branded email arrives from
  `movetick@mbeg.org` → link opens `/reset-password` → set new password → sign in.
- Sign up a new account → branded confirmation email from our domain.
