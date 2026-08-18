-- Tambah kolom simpan gambar & data anotasi skema koroner pada tabel public.tindakan
alter table public.tindakan add column if not exists skema_koroner_url text;
alter table public.tindakan add column if not exists skema_koroner_data jsonb;

comment on column public.tindakan.skema_koroner_url is 'URL hasil ekspor gambar arsiran skema angiografi koroner (PNG/WebP)';
comment on column public.tindakan.skema_koroner_data is 'JSON data state stroke drawing, arsiran, dan anotasi skema koroner';
