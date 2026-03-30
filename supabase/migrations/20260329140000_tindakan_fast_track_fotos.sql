-- Foto dokumentasi Fast-Track (JSON array URL publik storage).
alter table public.tindakan add column if not exists fast_track_fotos text;

comment on column public.tindakan.fast_track_fotos is 'JSON array string URL gambar Fast-Track, mis. ["https://..."]';
