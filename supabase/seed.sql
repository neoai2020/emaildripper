insert into public.settings (id, tooltips_enabled, theme, default_tz, backup_retention_days)
values (1, true, 'dark', 'Europe/Vienna', 365)
on conflict (id) do nothing;
