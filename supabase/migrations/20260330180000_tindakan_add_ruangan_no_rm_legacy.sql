-- Skema sederhana `tindakan` (bigint id, nama, dokter, …) sering belum punya ruangan/no_rm.
-- Tambah kolom opsional agar selaras dengan UI daftar kasus & PATCH API.

alter table public.tindakan add column if not exists ruangan text;
alter table public.tindakan add column if not exists no_rm text;

comment on column public.tindakan.ruangan is 'Lokasi / ruangan (label dari master ruangan).';
comment on column public.tindakan.no_rm is 'Nomor rekam medis (opsional).';
