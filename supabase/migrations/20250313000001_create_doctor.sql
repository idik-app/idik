-- Tabel doctor — modul Dokter IDIK-App
-- Sesuai lib/database.types.ts (Doctor) dan API. Gunakan tabel ini (bukan "dokter") agar konsisten.

create table if not exists public.doctor (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  nama_dokter text,
  spesialis text,
  nomor_str text,
  nomor_sip text,
  kontak text,
  email text,
  status boolean default true
);

create index if not exists idx_doctor_nama on public.doctor (nama_dokter);
create index if not exists idx_doctor_status on public.doctor (status);

comment on table public.doctor is 'Data dokter Cathlab IDIK-App. Modul: Dokter.';
