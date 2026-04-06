-- Hands-off posting: random Drive media + optional AI caption on a cadence (cron).

create table if not exists public.auto_post_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  cadence text not null default 'daily'
    check (cadence in ('daily', 'every_3_days', 'weekly', 'monthly')),
  next_run_at timestamptz,
  use_ai_caption boolean not null default true,
  drive_folder_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auto_post_settings_due_idx
  on public.auto_post_settings (next_run_at)
  where enabled = true;

alter table public.auto_post_settings enable row level security;

create policy "auto_post_settings_select_own"
  on public.auto_post_settings for select
  using (auth.uid() = user_id);

create policy "auto_post_settings_insert_own"
  on public.auto_post_settings for insert
  with check (auth.uid() = user_id);

create policy "auto_post_settings_update_own"
  on public.auto_post_settings for update
  using (auth.uid() = user_id);

create policy "auto_post_settings_delete_own"
  on public.auto_post_settings for delete
  using (auth.uid() = user_id);
