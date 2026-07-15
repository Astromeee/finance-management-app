# Pocket Ledger public beta release checklist

The application and relational database cutover are implemented. Complete these provider-owned settings before enabling public signup.

## Supabase Auth

- Supabase leaked-password protection is intentionally deferred because it requires a paid plan. Accepted Free-plan mitigation: require 12+ characters with uppercase, lowercase, a number, and a symbol; keep verified email enabled; add Turnstile before signup opens.
- Match Supabase Auth's server-side password requirements to the app policy above.
- Enable Cloudflare Turnstile and add the matching secret key; set `VITE_TURNSTILE_SITE_KEY` in staging and production.
- Configure free Google OAuth credentials, then set `VITE_GOOGLE_AUTH_ENABLED=true` only after a successful staging test.
- Add exact staging and production URLs for `/auth/callback` and `/reset-password` to the redirect allowlist.
- Configure a custom SMTP provider and test verification, recovery, and reauthentication messages.
- Brand the verification and recovery email templates.

## Public information

- Have the beta Privacy Policy and Terms draft reviewed and approved by the owner or a qualified legal reviewer.
- Confirm `a.moeed1875@gmail.com` is actively monitored for support and deletion requests.
- Confirm the data-retention and account-deletion wording.

## Deployment

- Deploy to staging with only the Supabase publishable key in frontend environment variables.
- Confirm security headers using the deployed response, including CSP and `frame-ancestors`.
- Run the authenticated end-to-end suite using dedicated staging accounts for email and Google.
- Rerun desktop and mobile screenshots after the final provider configuration.
- Privacy-filtered crash monitoring is implemented in Supabase with 30-day automatic retention and no financial content, email addresses, messages, or stack traces.
- Enable public signup only after the checks above pass.

Public signup is currently hard-disabled by `VITE_PUBLIC_SIGNUP_ENABLED=false`. Do not change it until every provider and staging item above passes.
