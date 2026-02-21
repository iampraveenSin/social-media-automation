-- Add media_type to posts (image | video) for Instagram publish
alter table public.posts add column if not exists media_type text;
