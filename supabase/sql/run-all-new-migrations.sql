-- =============================================================================
-- Run this in Supabase SQL Editor to add all new schema changes.
-- Safe to run multiple times (uses IF NOT EXISTS where needed).
-- Requires: public.users and public.posts tables (from your main schema).
-- =============================================================================

-- 1. Posts: media_type for images, videos, and GIFs (Instagram/Facebook publish)
-- -----------------------------------------------------------------------------
alter table public.posts add column if not exists media_type text;

comment on column public.posts.media_type is 'image | video: used when publishing to Instagram/Facebook (images, videos, GIFs)';

-- 2. Recurrence settings table (if not already created)
-- -----------------------------------------------------------------------------
create table if not exists public.recurrence_settings (
  app_user_id uuid primary key references public.users(id) on delete cascade,
  enabled boolean not null default false,
  frequency text not null default 'daily' check (frequency in ('daily','every_3_days','weekly','monthly')),
  next_run_at timestamptz,
  drive_folder_id text
);

create index if not exists recurrence_settings_enabled_next on public.recurrence_settings(enabled, next_run_at) where enabled = true;

-- 3. Recurrence: auto-post time slots and round-robin index
--    (so each auto-post uses a different time: 9 AM, 2 PM, 7 PM, etc.)
-- -----------------------------------------------------------------------------
alter table public.recurrence_settings
  add column if not exists post_times text,
  add column if not exists next_time_index integer default 0;

comment on column public.recurrence_settings.post_times is 'JSON array of "HH:mm" strings, e.g. ["09:00","14:00","19:00"]';
comment on column public.recurrence_settings.next_time_index is 'Index into post_times for next run (round-robin)';
