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
- Settings backups: create gzip snapshot via server action; list recent `app-backups` objects; cron GET lists snapshots with token.

### Changed

- `POST /api/backup-snapshot` now stores gzip JSON (`v: 2`) and logs gzip metadata.

### Notes

- Restore/delete backup objects from the Storage UI or API are documented as follow-up; signed download URLs are not rendered in-app yet.
