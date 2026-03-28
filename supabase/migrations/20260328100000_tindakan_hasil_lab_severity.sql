-- Kolom klinis yang dipakai drawer / PATCH API; aman jika sudah ada di DB produksi.

alter table public.tindakan add column if not exists hasil_lab_ppm text;
alter table public.tindakan add column if not exists severity_level text;

comment on column public.tindakan.hasil_lab_ppm is 'Hasil lab / PPM (teks).';
comment on column public.tindakan.severity_level is 'Severity level kasus (teks).';
