-- Private bucket for manual post uploads (paths: {user_id}/...)

insert into storage.buckets (id, name, public, file_size_limit)
values ('post_media', 'post_media', false, 52428800)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;

-- Path must start with auth.uid() as first segment
create policy "post_media_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post_media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "post_media_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post_media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "post_media_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post_media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "post_media_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post_media'
    and split_part(name, '/', 1) = auth.uid()::text
  );
