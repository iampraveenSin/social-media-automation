-- Google Drive OAuth refresh token per user (server-side only; RLS).

create table if not exists public.google_drive_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  refresh_token text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_drive_accounts_user_id_key unique (user_id)
);

create index if not exists google_drive_accounts_user_id_idx
  on public.google_drive_accounts (user_id);

alter table public.google_drive_accounts enable row level security;

create policy "google_drive_accounts_select_own"
  on public.google_drive_accounts for select
  using (auth.uid() = user_id);

create policy "google_drive_accounts_insert_own"
  on public.google_drive_accounts for insert
  with check (auth.uid() = user_id);

create policy "google_drive_accounts_update_own"
  on public.google_drive_accounts for update
  using (auth.uid() = user_id);

create policy "google_drive_accounts_delete_own"
  on public.google_drive_accounts for delete
  using (auth.uid() = user_id);
