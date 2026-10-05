# Optional Google login and private bookmarks

Browsing and watching remain public. Google login is optional and only enables saving general content and FCDS playlists to a private library synchronized through Supabase.

## Live setup verified on 2026-10-06

- Supabase Google provider is enabled. A Google Web OAuth client ID is configured, and the OAuth client secret is present (never expose or store it in this repository).
- Google callback shown by Supabase: `https://ypjneaoxluxausbseuju.supabase.co/auth/v1/callback`.
- Supabase Site URL is `https://naqya-main.vercel.app`; the only configured redirect URL is `https://naqya-main.vercel.app/auth/callback`.
- Live `public.content.id` and `public.fcds_playlists.id` are UUIDs, matching the bookmark foreign keys.
- Before migration, `public.user_bookmarks` did not exist. The migration in `supabase/migrations/20261005210000_user_bookmarks.sql` was then applied successfully.
- Post-migration inspection confirmed RLS is enabled; SELECT, INSERT and DELETE policies are restricted to `auth.uid() = user_id`; anonymous SELECT/INSERT/DELETE privileges are false; authenticated owners have the required operations; the table has zero rows.
- Live inspection found no non-internal trigger on `auth.users`; `public.user_roles` contains one admin. No existing signup trigger can grant a new Google user admin privileges.
- Google Cloud's OAuth audience/publishing state could not be verified because the Cloud Console returned “Site Unavailable” in the available browser. Do not claim public login availability until the app is confirmed published or the account being tested is an allowed test user.

## Implementation and local verification

- AccountProvider watches session changes and clears private bookmark cache when the account changes or signs out.
- GoogleSignIn uses Supabase OAuth with PKCE and only `openid email profile` scopes.
- AccountMenu supports sign-in, saved items and sign-out on the current device.
- SaveButton supports general content and FCDS playlists. `/saved` and `/auth/callback` handle the private library and OAuth return.
- Migration enforces exactly one source per row, prevents duplicate saves, and grants no update or admin-read policy.
- 12 automated tests pass, covering guest behavior, both source types, failed writes, removal, account filtering, cache cleanup, session races and OAuth error/scope handling.
- `VERCEL=1 npm run build` passes with the Nitro Vercel output.
- The generated Supabase `src/integrations/supabase/types.ts` is empty in the production repo, so `tsc --noEmit` reports three pre-existing type errors; generate real database types rather than inventing schema types.

## Still required before calling the feature live

- Verify Google OAuth audience/publication state in Google Cloud.
- Create a Vercel preview for the feature branch and test Google sign-in and callback on the real preview URL.
- Verify saves/removals persist after reload and on another device, confirm account isolation with two accounts, and test the existing public, FCDS, watch and admin routes.
- Promote to production only after the live OAuth flow and preview checks pass.
