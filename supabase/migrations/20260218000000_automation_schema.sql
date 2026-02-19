-- Automation app schema for Supabase
-- Run in Supabase Dashboard → SQL Editor, or: supabase db push

-- App users (multi-tenant login)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Scheduled posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.users(id) on delete cascade,
  media_id text not null,
  media_url text not null,
  caption text not null default '',
  hashtags jsonb not null default '[]',
  topic text,
  vibe text,
  audience text,
  logo_config jsonb,
  scheduled_at timestamptz not null,
  published_at timestamptz,
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','failed')),
  user_id text,
  created_at timestamptz not null default now(),
  instagram_media_id text,
  error text
);

create index if not exists posts_app_user_id on public.posts(app_user_id);
create index if not exists posts_user_id on public.posts(user_id);

-- Media items (uploaded or from Drive)
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  filename text not null,
  path text not null,
  url text not null,
  mime_type text not null default 'image/jpeg',
  width int,
  height int,
  uploaded_at timestamptz not null default now(),
  drive_file_id text
);

create index if not exists media_user_id on public.media(user_id);

-- Instagram (Meta) accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  app_user_id uuid not null references public.users(id) on delete cascade,
  instagram_business_account_id text not null,
  facebook_page_id text,
  username text not null,
  access_token text not null,
  connected_at timestamptz not null default now(),
  suggested_niche text,
  analyzed_at timestamptz
);

create index if not exists accounts_app_user_id on public.accounts(app_user_id);
create unique index if not exists accounts_user_id on public.accounts(user_id);

-- Drive (one per app user)
create table if not exists public.drive_accounts (
  app_user_id uuid primary key references public.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  folder_id text,
  connected_at timestamptz not null default now()
);

-- Drive posted round (track which file IDs were used per folder)
create table if not exists public.drive_posted_round (
  app_user_id uuid not null references public.users(id) on delete cascade,
  folder_id text not null default 'root',
  file_ids jsonb not null default '[]',
  primary key (app_user_id, folder_id)
);

-- RLS: disable so server uses service_role key (we scope by app_user_id in app code)
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;
alter table public.accounts enable row level security;
alter table public.drive_accounts enable row level security;
alter table public.drive_posted_round enable row level security;

-- Allow service role full access (default when using service_role key)
create policy "Service role full access users" on public.users for all using (true) with check (true);
create policy "Service role full access posts" on public.posts for all using (true) with check (true);
create policy "Service role full access media" on public.media for all using (true) with check (true);
create policy "Service role full access accounts" on public.accounts for all using (true) with check (true);
create policy "Service role full access drive_accounts" on public.drive_accounts for all using (true) with check (true);
create policy "Service role full access drive_posted_round" on public.drive_posted_round for all using (true) with check (true);
