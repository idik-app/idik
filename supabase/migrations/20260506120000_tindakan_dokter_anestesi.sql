-- Dokter anestesi per kasus tindakan (teks bebas, selaras PATCH + daftar kasus).

alter table public.tindakan add column if not exists dokter_anestesi text;

comment on column public.tindakan.dokter_anestesi is
  'Nama dokter anestesi untuk kasus ini (input bebas; diisi dari tabel atau drawer Tim).';
