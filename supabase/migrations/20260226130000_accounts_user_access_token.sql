alter table if exists public.accounts
add column if not exists user_access_token text;

