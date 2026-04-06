-- Run in Supabase SQL editor or via CLI. Stores Meta (Facebook) OAuth tokens per user (RLS).

create table if not exists public.meta_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  facebook_user_id text,
  user_access_token text not null,
  token_expires_at timestamptz,
  selected_page_id text,
  selected_page_name text,
  page_access_token text,
  instagram_account_id text,
  instagram_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meta_accounts_user_id_key unique (user_id)
);

create index if not exists meta_accounts_user_id_idx on public.meta_accounts (user_id);

alter table public.meta_accounts enable row level security;

create policy "meta_accounts_select_own"
  on public.meta_accounts for select
  using (auth.uid() = user_id);

create policy "meta_accounts_insert_own"
  on public.meta_accounts for insert
  with check (auth.uid() = user_id);

create policy "meta_accounts_update_own"
  on public.meta_accounts for update
  using (auth.uid() = user_id);

create policy "meta_accounts_delete_own"
  on public.meta_accounts for delete
  using (auth.uid() = user_id);
