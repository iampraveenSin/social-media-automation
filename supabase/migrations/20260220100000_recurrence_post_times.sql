-- Add post times (3 slots) and round-robin index so each auto-post uses a different time
alter table public.recurrence_settings
  add column if not exists post_times text,
  add column if not exists next_time_index integer default 0;

comment on column public.recurrence_settings.post_times is 'JSON array of "HH:mm" strings, e.g. ["09:00","14:00","19:00"]';
comment on column public.recurrence_settings.next_time_index is 'Index into post_times for next run (round-robin)';
