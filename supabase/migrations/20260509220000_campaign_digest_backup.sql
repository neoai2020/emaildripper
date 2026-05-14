-- Campaign flags, digest/backup bookkeeping, backups bucket

alter table public.campaigns
  add column if not exists dry_run boolean not null default false,
  add column if not exists test_mode boolean not null default false;

alter table public.settings
  add column if not exists digest_config jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('app-backups', 'app-backups', false)
on conflict (id) do nothing;
