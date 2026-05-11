# Drip Importer — PRD status

Honest markers for major PRD buckets (partial = shipped with known gaps).

| Area | Status | Notes |
| --- | --- | --- |
| A1 Test mode (preview → Make, modal, sent) | **Complete** | First three pending; launch remaining / cancel; close keeps `previewing`. |
| A2 Wizard dry schedule | **Complete** | No DB writes; CSV download; feels-human path shared with preview build. |
| A3 Wizard validation + cap | **Complete** | Cards + slider; schedule respects cap via `scheduleLeadLimit`. |
| A4 (excluded) | — | Skipped per scope. |
| A5 Soft delete / undo / purge | **Complete** | `purge_at`, nightly UTC purge in tick, undo → `paused`, filter. |
| A6 Worker hardening | **Complete** | `last_successful_tick_at`, `tick_log.slow`, cap 10, help text on idempotency. |
| A7 Dashboard | **Partial** | Polling, tables, charts, pause; AR cap bars heuristic; sparkline uses gap bars not minute ticks. |
| A8 Help | **Partial** | Accordion + feedback + worker notes; not every legacy section ported verbatim. |
| A9 Tooltips | **Partial** | Registry expanded + key surfaces; not every field in the app. |
| A10 Empty states | **Partial** | Component + campaigns / master / suppression; not every list page. |
| A11 Rate limiting | **Complete** | Middleware + existing route limiters; in-memory limits are best-effort per instance. |
| A12 Backups | **Partial** | Gzip upload, list, admin create; signed download / restore / delete UI stubbed in copy. |
| A13 Suppression CSV | **Complete** | Upload + counts. |
| A15 Filters | **Partial** | Campaigns debounced + recoverable; GET `q` on master, suppression, campaign leads; audit still action-filter. |
| B polish (skeletons / toasts / confirms) | **Partial** | Campaigns skeleton; toasts on several flows; destructive confirms not exhaustively added. |
| C1/C2 Docs | **Complete** | This file + `CHANGELOG.md`. |

### Browser verification (production)

Validate on `https://king-prawn-app-6mfwy.ondigitalocean.app/` after deploy:

1. Wizard validation + slider + dry schedule CSV (step 3–5).
2. Preview test send + modal flows + launch remaining.
3. Cancel → undo cancel → recoverable filter → wait / simulate purge (advanced).
4. Dashboard 30s refresh and pause button.
5. Middleware 429 + `Retry-After` on abusive `/api/*` traffic (non-destructive probe only).
6. Suppression CSV upload counts.
7. Help accordion + thumbs → audit log entries.
8. Settings → Backups create + file list (requires `app-backups` bucket + service role).

### Blockers / operator steps

- **Supabase migration**: apply `supabase/migrations/20260511140000_prd_finishing_worker_purge.sql` (adds columns + index).
- **Storage**: ensure `app-backups` bucket exists (included in earlier migration); verify service role can list/write.
- **Environment**: `CRON_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` unchanged; no Telegram/email alert env required.
