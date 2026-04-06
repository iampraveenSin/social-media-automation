-- Queued Facebook Page publishes. Processed by /api/cron/process-scheduled (service role).

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  caption text not null,
  items jsonb not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'published', 'failed', 'cancelled')),
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts (status, scheduled_at)
  where status = 'pending';

create index if not exists scheduled_posts_user_idx
  on public.scheduled_posts (user_id, created_at desc);

alter table public.scheduled_posts enable row level security;

create policy "scheduled_posts_select_own"
  on public.scheduled_posts for select
  using (auth.uid() = user_id);

create policy "scheduled_posts_insert_own"
  on public.scheduled_posts for insert
  with check (auth.uid() = user_id);

create policy "scheduled_posts_update_own"
  on public.scheduled_posts for update
  using (auth.uid() = user_id);
