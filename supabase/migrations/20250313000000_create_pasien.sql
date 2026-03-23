-- Tabel pasien — modul Pasien IDIK-App
-- Sesuai payload addPatient/editPatient dan app/dashboard/pasien/types/pasien.ts

create table if not exists public.pasien (
  id uuid primary key default gen_random_uuid(),
  no_rm text,
  nama text,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  tgl_lahir date,
  alamat text,
  no_telp text,
  jenis_pembiayaan text,
  kelas_perawatan text,
  asuransi text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pasien_no_rm on public.pasien (no_rm);
create index if not exists idx_pasien_nama on public.pasien (nama);
create index if not exists idx_pasien_updated_at on public.pasien (updated_at);

comment on table public.pasien is 'Data pasien Cathlab IDIK-App. Modul: Pasien.';
