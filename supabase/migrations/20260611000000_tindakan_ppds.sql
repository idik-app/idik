-- PPDS per kasus tindakan (teks bebas, selaras PATCH + daftar kasus).

alter table public.tindakan add column if not exists ppds text;

comment on column public.tindakan.ppds is
  'Nama PPDS untuk kasus ini (input bebas; diisi dari tabel atau drawer Tim).';
