# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- Preview “test send” posts the first three pending leads to Make with a per-lead result modal; launch remaining or cancel from the modal leaves preview status on close.
- Wizard validation cards (syntax, duplicates, suppression, MX) with a capped “how many to use” slider; dry-run schedule preview (no DB) on step 5 with CSV download.
- Cancelled campaigns carry a 30-day `purge_at`; nightly purge from the tick worker (once per UTC day); undo cancel to paused; campaigns list filter for recoverable cancelled rows.
- Worker: `tick_log.slow` when a tick exceeds 25s; `settings.last_successful_tick_at` on healthy completions; lower per-tick lead cap (10); health check prefers successful tick timestamp.
- Dashboard client polling (30s) with active campaigns, AR send-vs-cap bars, expanded failures, tick-gap chart, pause shortcut, and refreshed copy.
- Help page accordion sections, worker/idempotency notes, and audit-logged thumbs feedback.
- Expanded tooltips registry and contextual tips on preview, wizard, and related surfaces.
- Reusable empty states and list skeleton; debounced campaigns search plus filters on master leads, suppression, campaign detail leads.
- Next.js middleware rate limits (`/api/*` except stricter `/api/tick`).
- Suppression CSV bulk upload with added / duplicate / invalid counts.
- Settings backups: signed download (short-lived URL), typed verify (gzip digest check, no table restore), typed delete; UI actions per file.
- Sidebar worker health dot (polls `/api/health` every 30s) and skip-to-content link.
- `StatusBadge` for campaign and lead statuses; typed **CANCEL** confirmation for campaign cancel (sheet UI).
- Campaign detail **Delivery log** (recent `campaign_lead_logs` with timestamps, HTTP, outcome).
- Preferences: Make.com monthly tier preset + custom limit for dashboard ops estimate.
- Route-level loading skeletons for dashboard and campaigns lists.
- `/api/health` returns JSON with `level` and seconds-since-tick fields for UI (HTTP 200); middleware rate limiting unchanged.

### Changed

- Make.com outbound lead webhooks: HMAC-SHA256 signs a fixed pipe-separated string (`lead_id|campaign_id|email|timestamp`, UTF-8, lowercase hex) for easier verification in Make.
- `POST /api/backup-snapshot` now stores gzip JSON (`v: 2`) and logs gzip metadata.
- Dashboard: KPI grid (`<dl>`-style cards), leads-in-flight metric, UTC-month Make ops estimate, 1-hour minute tick timeline, failures from `campaign_lead_logs`, active campaign table with tag chip and `StatusBadge`.
- Tooltips and copy pass for operator-facing language (dashboard + CSV field map).
- Global `text-sm` body, tabular numbers on table cells, `prefers-reduced-motion` guard.
- Legacy alert columns removed from `settings` (Telegram / alert email) — migration `20260512160000_drop_legacy_alert_columns.sql`.
- Supabase migration `20260509220000_campaign_digest_backup.sql`: campaign `dry_run` / `test_mode`, settings `digest_config`, and private `app-backups` storage bucket (idempotent `IF NOT EXISTS` / `ON CONFLICT`).

### Notes

- v2 backup snapshots remain digest/summary files; full database restore is via Supabase Pro backups. In-app “Verify” only checks the archive can be parsed.
