# Usage analytics

The overview combines a new usage dashboard with the preserved legacy daily traffic history. Detailed metrics begin at `analytics_private.config.tracked_since`; historical `site_visits` data cannot be backfilled into visitor retention or library attribution because its browser key changed daily.

## Definitions

- A visitor is a stable browser UUID in local storage, not a verified person. Clearing storage or using another browser creates another visitor.
- A session is stored in session storage and restarts after 30 minutes of inactivity; different tabs can have different sessions.
- NAQYA source opens count navigation to `/watch/:id`. DARB source opens count intentional YouTube link clicks. Neither proves playback or completion.
- Page events are deduplicated in 30-second buckets, search terms in 10-minute buckets, and opens/saves/shares in 30-minute buckets. Fixed buckets can count repeats across a boundary.
- Returning visitors were first seen in that library before the selected period. All-library visitors are deduplicated across libraries.
- Seven-day retention uses new visitors first seen in the selected period with seven complete observation days, and a return on a later local day within seven days. An empty eligible cohort displays “Collecting data”.
- Sessions are attributed to their entry source/campaign. Untagged app referrals can appear as “Direct / unknown”. Use `utm_source` and `utm_campaign` for campaign links.
- Today and initial comparison periods are incomplete. All reporting day boundaries use Africa/Cairo.
- Coverage, pending suggestions, and open reports are current totals, not period activity.

## Data boundaries

Raw events and configuration are in the non-exposed `analytics_private` schema with RLS and no client privileges. Public ingestion is an intentionally anonymous, write-only SECURITY DEFINER RPC with fixed search_path, input validation, deduplication, and a per-browser hourly cap. Aggregation explicitly checks authenticated admin membership and is not executable by anon. The RPC does not accept user IDs, event timestamps, or arbitrary metadata.

Only pathnames, public resource IDs/course slugs, short sanitized campaign identifiers, and sanitized search terms are recorded. No IPs, full referrer URLs, auth details, or query strings are stored. Pasted URLs, email-like and phone-like searches are skipped. New analytics honor Do Not Track and exclude requests authenticated as curators; legacy history follows the previous implementation.

SQL verification covered anonymous ingestion, denied anonymous raw/aggregate reads, denied unauthenticated aggregate calls, deduplication, library isolation, zero-result searches, sensitive-term rejection, returning visitors, and mature retention cohorts. Fixtures were rolled back. Application tests cover browser/session continuity, attribution, filters, honest empty states, and telemetry failures.
