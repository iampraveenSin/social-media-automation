-- Reliable source label (manual / scheduled / auto). Mirrors JSON for reads + backfill.

alter table public.published_posts
  add column if not exists publish_source text;

comment on column public.published_posts.publish_source is 'manual | scheduled | auto';

-- Backfill from existing media_summary JSON where present
update public.published_posts
set publish_source = media_summary ->> 'publish_source'
where (publish_source is null or publish_source = '')
  and media_summary is not null
  and media_summary ? 'publish_source';
