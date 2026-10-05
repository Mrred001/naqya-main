# Optional Google login and private bookmarks — prepared, not live

The changes add optional Google sign-in, PKCE callback handling, an account dialog, sign-out on the current device, and a saved library covering both general content and FCDS playlists. Browsing and watching remain public. Bookmarks are fetched once per account through React Query; private cached data is cancelled and removed on session changes. No Google client secret belongs in Vite variables or repository files.

## Required setup before production

1. Check live database source IDs are UUIDs and inspect existing signup triggers. New Google users must not receive an admin role. Preserve the owner's existing admin role.
2. Apply `supabase/migrations/20261005210000_user_bookmarks.sql`. Each row references exactly one real source; duplicate saves are prevented. Anonymous access is revoked, and SELECT/INSERT/DELETE policies require the current user to own the row. No update grant or admin read policy is added.
3. In Google Cloud, create or reuse a dedicated NAQYA project. Configure an external OAuth application for the intended public audience and only `openid`, email and profile scopes. Do not request Drive, Gmail or YouTube access. Add the required support/developer email with the owner's confirmation where needed.
4. Create a Web application OAuth client. Authorized origin: `https://naqya-main.vercel.app`. Google callback URI: `https://ypjneaoxluxausbseuju.supabase.co/auth/v1/callback`. Keep the generated client secret private and enter it directly into Supabase's Google provider configuration. Credential creation or permission expansion needs user confirmation at action time under browser policy.
5. Set Supabase Site URL to `https://naqya-main.vercel.app` and allow `https://naqya-main.vercel.app/auth/callback`. For preview testing add only the exact preview callback, never a broad wildcard. Preserve existing approved redirects until reviewed.
6. Enable Google provider with Client ID and Client Secret. Review audience publishing/testing restrictions; do not report public login ready while only test users can authenticate.

## Verification

- Production target build passed locally with Nitro's Vercel preset.
- 12 automated tests passed, including guest saves, both source types, failed writes, owner filtering, removal, logout cache cleanup, stale session race and OAuth errors/scopes/callback.
- `tsc --noEmit` still has the 3 preexisting imports of the empty generated `src/integrations/supabase/types.ts`. No additional diagnostics from these changes. Generate actual database types rather than inventing schema types.
- Not yet verified live: actual Google authorization/callback, database migration and RLS isolation between two signed-in accounts, cross-device persistence, browser layout and deployment. Browser is currently blocked by native credential protection. Do not merge to production until the provider/database setup and live flows are verified.

## Acceptance checklist

Guest can browse every existing route. Guest save opens optional login. Google success exchanges PKCE and removes callback parameters. Cancellation has a readable retry screen. Save and removal persist after reload, and saved items appear from another device with the same account. A second account cannot see/delete the first account's bookmarks; anonymous reads/writes fail. General, FCDS, watch, saved, callback and existing admin routes work. New Google users have no admin privileges. Sign-out hides private data. Google secrets remain server-side in Supabase.

Official reference: https://supabase.com/docs/guides/auth/social-login/auth-google
