-- Deployment `tindakan` tanpa kolom kategori (skema minimal / migrasi parsial).
-- Wajib untuk PATCH kategori dari drawer & master_kategori_tindakan.

alter table public.tindakan add column if not exists kategori text;

comment on column public.tindakan.kategori is
  'Kategori kasus Cathlab (pilihan dari master_kategori_tindakan atau teks bebas).';
