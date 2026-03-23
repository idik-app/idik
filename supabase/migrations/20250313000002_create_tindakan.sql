-- Tabel tindakan — modul Tindakan IDIK-App
-- Satu tabel utama; view tindakan_medik untuk kompatibilitas kode yang pakai .from("tindakan_medik")

create table if not exists public.tindakan (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  tanggal date,
  waktu time,
  no_rm text,
  nama_pasien text,
  dokter_id uuid references public.doctor (id) on delete set null,
  tindakan text,
  kategori text,
  tarif_tindakan numeric,
  status text,
  ruangan text,
  diagnosa text,
  pasien_id uuid references public.pasien (id) on delete set null
);

create index if not exists idx_tindakan_tanggal on public.tindakan (tanggal desc);
create index if not exists idx_tindakan_dokter_id on public.tindakan (dokter_id);
create index if not exists idx_tindakan_pasien_id on public.tindakan (pasien_id);

comment on table public.tindakan is 'Tindakan medis Cathlab IDIK-App. Modul: Tindakan.';

-- View agar kode yang pakai .from("tindakan_medik") tetap jalan (dengan kolom "dokter" = nama dokter)
create or replace view public.tindakan_medik as
select
  t.id,
  t.created_at,
  t.updated_at,
  t.tanggal,
  t.waktu,
  t.no_rm,
  t.nama_pasien,
  t.dokter_id,
  d.nama_dokter as dokter,
  t.tindakan,
  t.kategori,
  t.tarif_tindakan,
  t.status,
  t.ruangan,
  t.diagnosa,
  t.pasien_id
from public.tindakan t
left join public.doctor d on d.id = t.dokter_id;
