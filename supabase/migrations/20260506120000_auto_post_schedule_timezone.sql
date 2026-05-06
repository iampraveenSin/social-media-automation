-- Smart vs manual next-run time; IANA zone for recommended-time scheduling on the server.

alter table public.auto_post_settings
  add column next_run_time_mode text not null default 'manual'
  check (next_run_time_mode in ('manual', 'smart'));

alter table public.auto_post_settings
  add column schedule_timezone text;
