# Drip Importer — PRD status

Honest markers for major PRD buckets (partial = shipped with known gaps).

| Area | Status | Notes |
| --- | --- | --- |
| A1 Test mode (preview → Make, modal, sent) | **Complete** | First three pending; launch remaining / cancel; close keeps `previewing`. |
| A2 Wizard dry schedule | **Complete** | No DB writes; CSV download; feels-human path shared with preview build. |
| A3 Wizard validation + cap | **Complete** | Cards + slider; schedule respects cap via `scheduleLeadLimit`. |
| A4 (excluded) | — | Skipped per scope. |
| A5 Soft delete / undo / purge | **Complete** | `purge_at`, nightly UTC purge in tick, undo → `paused`, filter. |
| A6 Worker hardening | **Complete** | `last_successful_tick_at`, `tick_log.slow`, cap 10; apply migration `20260511140000` on hosted DB. |
| A7 Dashboard | **Improved** | 30s refetch, KPIs incl. leads-in-flight + tick gap, 1h minute timeline, Make ops (UTC month), AR bars, failures from logs, active table + StatusBadge. |
| A8 Help | **Partial** | Accordion + feedback; scrub internal jargon where reported. |
| A9 Tooltips | **Partial** | Registry updated for dashboard + CSV map; not every field. |
| A10 Empty states | **Partial** | Shared component; campaign detail empty leads; extend to all template lists as follow-up. |
| A11 Rate limiting | **Complete** | Middleware 100/min per IP on `/api/*`; stricter `/api/tick` bucket. |
| A12 Backups | **Improved** | Create + list + signed download + typed delete + typed verify (no auto table restore). |
| A13 Suppression CSV | **Complete** | Upload + counts. |
| A15 Filters | **Partial** | Campaigns + master + suppression + campaign leads `q`; audit date range / full pagination still light. |
| B polish (skeletons / toasts / confirms) | **Partial** | Dashboard/campaigns `loading.tsx`; cancel typed confirm + preview uses FormData; not every server action has Sonner yet. |
| C1/C2 Docs | **Complete** | This file + `CHANGELOG.md`. |

### Browser verification (production)

Validate on `https://king-prawn-app-6mfwy.ondigitalocean.app/` after deploy:

1. Wizard validation + slider + dry schedule CSV (step 3–5).
2. Preview test send + modal flows + launch remaining.
3. Cancel → typed CANCEL sheet → campaigns list; undo cancel path.
4. Dashboard 30s refresh, tick timeline, Make ops banner when limit ≥80%.
5. Middleware 429 distribution on rapid `/api/health` (non-destructive probe).
6. Settings → Backups download / verify / delete flows.
7. Preferences Make tier + save; dashboard limit reflects value.
8. Sidebar worker dot + skip link + `/api/health` JSON.

### Blockers / operator steps

- **Supabase migrations**: ensure `20260511140000_prd_finishing_worker_purge.sql` and `20260512160000_drop_legacy_alert_columns.sql` are applied on the linked project.
- **Storage**: `app-backups` bucket + service role list/write for backup UI.
- **Environment**: `CRON_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` unchanged.
