-- Allow scheduling destination per queued post: Facebook, Instagram, or both.

alter table public.scheduled_posts
  add column if not exists channel text not null default 'facebook'
  check (channel in ('facebook', 'instagram', 'both'));

create index if not exists scheduled_posts_channel_idx
  on public.scheduled_posts (user_id, channel, created_at desc);
