-- Caption preferences for auto-post (same AI pipeline as manual/scheduled)
alter table public.recurrence_settings
  add column if not exists niche text,
  add column if not exists topic text,
  add column if not exists vibe text,
  add column if not exists audience text;

comment on column public.recurrence_settings.niche is 'Niche for AI caption (e.g. lifestyle, food, fitness)';
comment on column public.recurrence_settings.topic is 'Topic override for AI caption';
comment on column public.recurrence_settings.vibe is 'Vibe override for AI caption';
comment on column public.recurrence_settings.audience is 'Audience override for AI caption';
