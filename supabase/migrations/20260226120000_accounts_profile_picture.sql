alter table if exists public.accounts
add column if not exists profile_picture_url text;