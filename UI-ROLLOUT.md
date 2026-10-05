# NAQYA interface update

Prepared changes: weekly picks with previous/next controls, direct selection and touch swipes; separate About copy for general and FCDS libraries; Instagram contact; report submission and admin review; persisted light/dark theme; refreshed library surfaces and reduced-motion support.

## Activation order

1. Review and run `supabase/migrations/20261005200000_site_reports.sql` in the existing Supabase project SQL Editor using an authorized project administrator. It creates a new table without changing existing content. Visitors can insert only report fields and cannot read reports. Only authenticated users with an existing `user_roles` admin role can read reports and change status. No service-role key is used by the app. Applied to the existing project on 2026-10-05. Live inspection confirmed RLS enabled, three policies, anonymous submission allowed, anonymous reads denied, and anonymous status insertion denied.
2. Save the changed source files in `Mrred001/naqya-main`. The GitHub connector returns HTTP 403 `Resource not accessible by integration` for writes. Changes were uploaded through the authorized GitHub browser session to the `naqya-ui-reports` branch. Do not overwrite newer repository changes blindly; review the diff against the base first.
3. Deploy a preview in Vercel with the existing public Supabase configuration available at build time. Review at phone and desktop widths; verify light/dark persistence, both About dialogs, weekly selection and swiping. Verify with reduced motion enabled.
4. Submit a clearly identified test report, then sign in with an existing curator account and confirm the report is visible and its status can be changed. Verify ordinary visitors cannot read reports. Only then promote the verified preview.

## Validation and limits

- Unit tests cover weekly selection/wrapping, removal of a selected item, empty featured content, theme persistence and route matching.
- Vercel production build was checked locally. The changed UI has not yet been reviewed in a browser or deployed.
- TypeScript checking remains blocked by the pre-existing empty `src/integrations/supabase/types.ts`. Generate this file from the actual authorized database schema; do not replace it with guessed types or `any`.
- Public report submission follows the existing anonymous suggestions pattern. Database policies enforce length, defaults and access. They do not implement request rate limiting. Rate limiting or CAPTCHA can be added if abuse occurs.
- External thumbnail failures have a visual fallback; source content is unchanged.
