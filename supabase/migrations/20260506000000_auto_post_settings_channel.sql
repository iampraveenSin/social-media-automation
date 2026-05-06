-- Where automatic posts go: Facebook Page, linked Instagram, or both.

alter table public.auto_post_settings
  add column channel text not null default 'facebook'
  check (channel in ('facebook', 'instagram', 'both'));
