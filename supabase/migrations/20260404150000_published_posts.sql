-- History of publishes (Facebook Page for now). RLS: users see only their rows.

create table if not exists public.published_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null default 'facebook_page',
  caption text,
  status text not null check (status in ('published', 'failed')),
  facebook_post_id text,
  facebook_media_id text,
  media_summary jsonb not null default '{}'::jsonb,
  error_detail text,
  created_at timestamptz not null default now()
);

create index if not exists published_posts_user_created_idx
  on public.published_posts (user_id, created_at desc);

alter table public.published_posts enable row level security;

create policy "published_posts_select_own"
  on public.published_posts for select
  using (auth.uid() = user_id);

create policy "published_posts_insert_own"
  on public.published_posts for insert
  with check (auth.uid() = user_id);
