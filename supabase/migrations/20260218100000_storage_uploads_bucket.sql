-- Storage policies for the "uploads" bucket (images for Drive pick, upload, Instagram).
--
-- STEP 1: Create the bucket in Supabase Dashboard:
--   Storage → New bucket → Name: uploads → Public bucket: ON → Create.
--
-- STEP 2: Run this SQL in SQL Editor so the app can upload and files are readable:

-- Public read (anyone with the URL can view)
create policy "Public read uploads"
on storage.objects for select
using (bucket_id = 'uploads');

-- Allow uploads to uploads bucket (service_role key used by API)
create policy "Upload to uploads"
on storage.objects for insert
with check (bucket_id = 'uploads');

create policy "Update uploads"
on storage.objects for update
using (bucket_id = 'uploads');

create policy "Delete uploads"
on storage.objects for delete
using (bucket_id = 'uploads');
