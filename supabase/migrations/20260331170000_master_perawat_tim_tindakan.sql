-- Master perawat (asisten / sirkuler / logger) + kolom tim pada kasus tindakan.

create table if not exists public.master_perawat (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nama_perawat text not null,
  bidang text,
  aktif boolean not null default true
);

create index if not exists idx_master_perawat_nama on public.master_perawat (nama_perawat);
create index if not exists idx_master_perawat_aktif on public.master_perawat (aktif);

comment on table public.master_perawat is 'Master perawat Cathlab — pilihan tim (asisten, sirkuler, logger).';

alter table public.tindakan add column if not exists asisten text;
alter table public.tindakan add column if not exists sirkuler text;
alter table public.tindakan add column if not exists logger text;

comment on column public.tindakan.asisten is 'Nama perawat asisten (teks, selaras master_perawat).';
comment on column public.tindakan.sirkuler is 'Nama perawat sirkuler (teks).';
comment on column public.tindakan.logger is 'Nama perawat logger (teks).';
