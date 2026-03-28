-- Nomor Cathlab (1–3) per kasus; tab Lokasi di drawer detail tindakan.
alter table public.tindakan add column if not exists cath text;

comment on column public.tindakan.cath is
  'Cathlab: pilihan 1, 2, atau 3 (teks).';
