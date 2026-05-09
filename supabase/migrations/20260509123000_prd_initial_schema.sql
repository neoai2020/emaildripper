-- Drip Importer — PRD §6 schema (v1)
-- App uses service_role from Next.js server; RLS enabled without anon policies.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- autoresponders
-- ---------------------------------------------------------------------------
create table public.autoresponders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null
    check (provider in (
      'activecampaign',
      'aweber',
      'getresponse',
      'email_octopus',
      'other'
    )),
  account_email text not null,
  make_webhook_url text not null,
  webhook_secret text not null,
  daily_cap integer,
  warmup_enabled boolean not null default false,
  warmup_started_at timestamptz,
  warmup_curve jsonb,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index autoresponders_active_idx on public.autoresponders (is_active);

-- ---------------------------------------------------------------------------
-- master_leads
-- ---------------------------------------------------------------------------
create table public.master_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  last_name text,
  custom_fields jsonb not null default '{}'::jsonb,
  source_label text,
  first_seen_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- suppression_list
-- ---------------------------------------------------------------------------
create table public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text not null
    check (reason in (
      'hard_bounce',
      'soft_bounce_repeat',
      'unsubscribe',
      'complaint',
      'manual'
    )),
  source text not null
    check (source in ('manual_upload', 'make_callback', 'system')),
  added_at timestamptz not null default now(),
  notes text
);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  autoresponder_id uuid not null references public.autoresponders (id) on delete restrict,
  tag text not null unique,
  status text not null default 'draft'
    check (status in (
      'draft',
      'previewing',
      'scheduled',
      'running',
      'paused',
      'completed',
      'cancelled',
      'failed'
    )),
  total_leads integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  pending_count integer generated always as (greatest(total_leads - sent_count - failed_count, 0)) stored,
  time_window_hours numeric not null default 48,
  starts_at timestamptz,
  ends_at timestamptz,
  original_ends_at timestamptz,
  randomization_mode text not null default 'feels_human'
    check (randomization_mode in ('feels_human')),
  max_concurrent_per_tick integer not null default 3,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_tz text not null default 'Europe/Vienna',
  source_csv_path text,
  source_label text,
  created_at timestamptz not null default now(),
  launched_at timestamptz,
  completed_at timestamptz,
  paused_at timestamptz,
  cancelled_at timestamptz,
  deleted_at timestamptz,
  constraint campaigns_max_concurrent_chk check (max_concurrent_per_tick between 1 and 10)
);

create index campaigns_ar_idx on public.campaigns (autoresponder_id);
create index campaigns_status_idx on public.campaigns (status);

-- ---------------------------------------------------------------------------
-- campaign_leads
-- ---------------------------------------------------------------------------
create table public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  master_lead_id uuid references public.master_leads (id) on delete set null,
  email text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in (
      'pending',
      'processing',
      'sent',
      'failed',
      'skipped_quiet',
      'skipped_suppressed',
      'skipped_dup',
      'skipped_cancelled'
    )),
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  processing_lock uuid,
  processing_lock_expires_at timestamptz,
  sent_at timestamptz,
  make_response_status integer,
  make_response_body text,
  error_message text,
  unique (campaign_id, email)
);

create index campaign_leads_due_idx
  on public.campaign_leads (campaign_id, scheduled_at)
  where status = 'pending';

create index campaign_leads_status_idx
  on public.campaign_leads (campaign_id, status);

create index campaign_leads_scheduled_pending_idx
  on public.campaign_leads (scheduled_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- campaign_lead_logs
-- ---------------------------------------------------------------------------
create table public.campaign_lead_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_lead_id uuid not null references public.campaign_leads (id) on delete cascade,
  attempt_number integer not null,
  attempted_at timestamptz not null default now(),
  outcome text not null check (outcome in ('success', 'failure', 'retry_scheduled')),
  http_status integer,
  response_body text,
  error_message text,
  duration_ms integer
);

create index campaign_lead_logs_lead_idx on public.campaign_lead_logs (campaign_lead_id);

-- ---------------------------------------------------------------------------
-- campaign_templates
-- ---------------------------------------------------------------------------
create table public.campaign_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  autoresponder_id uuid references public.autoresponders (id) on delete set null,
  time_window_hours numeric not null default 48,
  max_concurrent_per_tick integer not null default 3,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  daily_cap integer,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- csv_column_mappings
-- ---------------------------------------------------------------------------
create table public.csv_column_mappings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  field_map jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb
);

create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- settings (singleton)
-- ---------------------------------------------------------------------------
create table public.settings (
  id integer primary key check (id = 1),
  tooltips_enabled boolean not null default true,
  theme text not null default 'dark',
  default_tz text not null default 'Europe/Vienna',
  telegram_bot_token text,
  telegram_chat_id text,
  alert_email text,
  email_smtp_config jsonb,
  randomization_settings jsonb not null default jsonb_build_object(
    'max_per_tick_default', 3,
    'gap_probability_floor', 0.15,
    'burst_probability_2', 0.20,
    'burst_probability_3', 0.05,
    'intra_bucket_jitter', 'uniform'
  ),
  backup_retention_days integer not null default 365,
  make_ops_monthly_limit integer,
  worker_dead_after_minutes integer not null default 5,
  failure_rate_alert_pct numeric not null default 10
);

-- ---------------------------------------------------------------------------
-- tick_log
-- ---------------------------------------------------------------------------
create table public.tick_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  leads_processed integer not null default 0,
  duration_ms integer not null default 0,
  errors integer not null default 0
);

create index tick_log_at_idx on public.tick_log (at desc);

-- ---------------------------------------------------------------------------
-- Storage bucket for campaign CSVs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('campaign-csv', 'campaign-csv', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS: enabled; service_role bypasses. No broad anon policies (server-only).
-- ---------------------------------------------------------------------------
alter table public.autoresponders enable row level security;
alter table public.master_leads enable row level security;
alter table public.suppression_list enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.campaign_lead_logs enable row level security;
alter table public.campaign_templates enable row level security;
alter table public.csv_column_mappings enable row level security;
alter table public.audit_log enable row level security;
alter table public.settings enable row level security;
alter table public.tick_log enable row level security;
