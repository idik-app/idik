-- Bucket `uploads` untuk foto Fast-Track (path `fast_track/...`).
-- Menghilangkan error Storage "Bucket not found".

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = excluded.public;

-- Pratinjau gambar di browser (URL publik).
drop policy if exists "uploads_public_read" on storage.objects;
create policy "uploads_public_read"
  on storage.objects
  for select
  using (bucket_id = 'uploads');
