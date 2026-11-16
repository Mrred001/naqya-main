# Free Google + Email OTP sign-in rollout (NAQYA / DARB)

The login interface is intentionally safe to deploy before external providers are configured:
the existing Supabase Google OAuth redirect remains available, and the email option is hidden
unless `VITE_EMAIL_OTP_ENABLED=true` is set.

## Direct Google login (no Supabase hostname in the Google account chooser)

1. In Google Cloud > Google Auth Platform > Clients, locate the existing **Web application**
   OAuth client currently used by Supabase. Do not create a separate unrelated project.
2. Under **Authorized JavaScript origins**, add `https://naqya-main.vercel.app`.
   Keep the existing Supabase authorized redirect URI; it is still needed for fallback OAuth.
3. Set `VITE_GOOGLE_CLIENT_ID` on Vercel to the public Web OAuth client ID
   (the `....apps.googleusercontent.com` identifier, **not the client secret**).
4. Rebuild a preview, test on mobile and desktop, verify an existing Google user retains
   saved content and bookmarks, and then deploy.

If the variable is unset, the Google Identity Services script fails to load, or a user
chooses the alternative, the original Supabase OAuth redirect remains available. Never
expose the Google OAuth client secret in client code.

## Email OTP (free-tier-compatible backend, requires mail delivery)

1. Set up **custom SMTP** in Supabase Authentication > Emails > SMTP Settings with
   credentials from an SMTP provider. The built-in Supabase mail service is restricted to
   organization-team recipient emails and is not a production SMTP solution. Some providers
   have free allocations; verify eligibility, sending-domain requirements and rate limits.
2. In Supabase Authentication > Email Templates > Magic Link / OTP, include
   `{{ .Token }}` in the email template to send a numeric OTP. Without this, Supabase
   sends a magic link by default, which the UI also explains to the user.
3. Keep email confirmation enabled. Ensure the Site URL is
   `https://naqya-main.vercel.app` and `/auth/callback` is in allowed redirect URLs.
4. Send a code to a test email **not** in the Supabase project organization. Verify it
   arrives, signs in, and bookmarks remain private to the correct account. Also test
   an existing Google account to verify its identity is not duplicated unexpectedly.
5. Only after this end-to-end test, set `VITE_EMAIL_OTP_ENABLED=true` on Vercel and redeploy.

Do not place SMTP passwords, Supabase service-role keys or other secrets into GitHub.
Keep Supabase RLS policies unchanged. Rate-limit abuse protection (and CAPTCHA if needed)
should be reviewed before a wider public rollout.

Relevant documentation:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
