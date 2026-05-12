-- Rotates random/auto Drive picks: every Nth pick can be forced to a single image or video (see app).

alter table public.google_drive_accounts
  add column if not exists drive_pick_count integer not null default 0;

comment on column public.google_drive_accounts.drive_pick_count is
  'Increments on each non-empty random/auto Drive pick; used to force a single image/video every N picks.';
