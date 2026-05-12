-- Operational baseline for worker + launch flows (idempotent).
-- Fixes missing singleton row and columns if an environment applied only part of prior migrations.

alter table public.settings
  add column if not exists digest_config jsonb not null default '{}'::jsonb,
  add column if not exists last_successful_tick_at timestamptz,
  add column if not exists last_cancel_purge_utc date;

alter table public.tick_log
  add column if not exists slow boolean not null default false;

alter table public.campaigns
  add column if not exists dry_run boolean not null default false,
  add column if not exists test_mode boolean not null default false,
  add column if not exists purge_at timestamptz;

create index if not exists campaigns_cancelled_purge_idx
  on public.campaigns (purge_at)
  where status = 'cancelled' and purge_at is not null;

insert into public.settings (id)
values (1)
on conflict (id) do nothing;
