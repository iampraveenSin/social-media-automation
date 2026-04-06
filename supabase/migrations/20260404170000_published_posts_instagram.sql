-- Optional Instagram media id for publish history (Facebook columns stay for Page posts).

alter table public.published_posts
  add column if not exists instagram_media_id text;
