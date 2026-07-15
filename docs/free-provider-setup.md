# Pocket Ledger free provider setup

Public signup must remain disabled until this checklist is completed. No paid plan or custom domain is required for the private beta setup below.

## Current public identity

- Operator: Abdul Moeed
- Support and sender email: `a.moeed1875@gmail.com`
- Production app URL: `https://pocket-ledger-seven-phi.vercel.app`
- Supabase project: `ioojdmerropjhoaazrez`
- Supabase OAuth callback: `https://ioojdmerropjhoaazrez.supabase.co/auth/v1/callback`

## 1. Supabase email security

In Supabase Dashboard → Authentication → Providers → Email:

- Keep email confirmation enabled.
- Set minimum password length to 12.
- Require uppercase, lowercase, number, and symbol.
- Do not enable leaked-password protection; it is unavailable on the Free plan.
- Keep `VITE_PUBLIC_SIGNUP_ENABLED=false` until the complete checklist passes.

## 2. Cloudflare Turnstile (free)

Create a free Cloudflare account and a managed Turnstile widget named `Pocket Ledger`.

Allow these hostnames:

- `pocket-ledger-seven-phi.vercel.app`
- The exact protected Vercel preview hostname used for staging
- `localhost` for local testing

Put the Turnstile **secret key** only in Supabase Dashboard → Authentication → Bot and Abuse Protection. Put the public **site key** in `VITE_TURNSTILE_SITE_KEY` for Vercel Preview and Production. Never put the secret in Vercel or the frontend repository.

Test signup, login, and forgot-password flows before proceeding.

## 3. Google OAuth (free)

In Google Cloud Console, create a project named `Pocket Ledger`, configure an External OAuth consent screen, and use `a.moeed1875@gmail.com` for user support and developer contact.

Create a Web application OAuth client with this authorized redirect URI:

`https://ioojdmerropjhoaazrez.supabase.co/auth/v1/callback`

Put the Google client ID and client secret only in Supabase Dashboard → Authentication → Providers → Google. After a successful staging sign-in, set `VITE_GOOGLE_AUTH_ENABLED=true` in the intended Vercel environment and redeploy.

## 4. SMTP without a custom domain (free beta option)

For a small private beta, Gmail SMTP can be used with the support account:

- Enable two-step verification on `a.moeed1875@gmail.com`.
- Create a Google App Password for Pocket Ledger.
- In Supabase Dashboard → Authentication → SMTP, use host `smtp.gmail.com`, port `587`, username `a.moeed1875@gmail.com`, and the App Password as the SMTP password.
- Use sender name `Pocket Ledger` and sender address `a.moeed1875@gmail.com`.

The App Password is a secret. Enter it directly in Supabase and never place it in chat, source control, Vercel, or a local frontend environment file.

Gmail SMTP is suitable only for a controlled beta. Before a larger public launch, obtain a domain and move authentication email to a dedicated transactional sender with SPF, DKIM, and DMARC.

## 5. Supabase URLs and email branding

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://pocket-ledger-seven-phi.vercel.app`
- Add `https://pocket-ledger-seven-phi.vercel.app/auth/callback`
- Add `https://pocket-ledger-seven-phi.vercel.app/reset-password`
- Add only the exact staging preview callback/reset URLs being tested; avoid a broad Vercel wildcard.

In Authentication → Email Templates, use the Pocket Ledger name, concise security-focused copy, and the existing confirmation/recovery template variables. Send real verification and recovery emails to a dedicated staging account and confirm that each link returns to the correct route.

## 6. Final release gate

Only after all email, Google, Turnstile, deletion, mobile, desktop, and accessibility tests pass:

1. Set `VITE_GOOGLE_AUTH_ENABLED=true` if Google is ready.
2. Set `VITE_PUBLIC_SIGNUP_ENABLED=true` in Vercel Production.
3. Redeploy the already-tested artifact to Production.

Do not enable signup merely because the UI is complete.
