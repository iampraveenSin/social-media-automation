-- Recurring auto-post from Drive (daily, every 3 days, weekly, monthly)
create table if not exists public.recurrence_settings (
  app_user_id uuid primary key references public.users(id) on delete cascade,
  enabled boolean not null default false,
  frequency text not null default 'daily' check (frequency in ('daily','every_3_days','weekly','monthly')),
  next_run_at timestamptz,
  drive_folder_id text
);

create index if not exists recurrence_settings_enabled_next on public.recurrence_settings(enabled, next_run_at) where enabled = true;
