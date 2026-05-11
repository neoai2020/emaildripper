-- PRD finishing: worker bookkeeping, tick slow flag, cancellable purge window

alter table public.settings
  add column if not exists last_successful_tick_at timestamptz,
  add column if not exists last_cancel_purge_utc date;

alter table public.tick_log
  add column if not exists slow boolean not null default false;

alter table public.campaigns
  add column if not exists purge_at timestamptz;

create index if not exists campaigns_cancelled_purge_idx
  on public.campaigns (purge_at)
  where status = 'cancelled' and purge_at is not null;
