-- Kolom katalog (kategori alkes, LOT, ukuran, ED) pada mapping distributor.
-- Menyertakan definisi tabel dasar bila migrasi 20260318000000 belum pernah dijalankan
-- (mis. hanya file ini yang di-apply manual di SQL editor).

create table if not exists public.distributor_barang (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  distributor_id uuid not null references public.master_distributor (id) on delete cascade,
  master_barang_id uuid not null references public.master_barang (id) on delete cascade,

  kode_distributor text,
  harga_jual numeric,
  min_stok numeric default 0,
  is_active boolean default true,

  unique (distributor_id, master_barang_id)
);

create index if not exists idx_distributor_barang_distributor_id
  on public.distributor_barang (distributor_id);

create index if not exists idx_distributor_barang_master_barang_id
  on public.distributor_barang (master_barang_id);

alter table public.distributor_barang
  add column if not exists barcode text,
  add column if not exists kategori text,
  add column if not exists lot text,
  add column if not exists ukuran text,
  add column if not exists ed text;

comment on column public.distributor_barang.barcode is
  'Barcode kemasan yang diinput/discan distributor; disimpan bersama mapping produk.';
comment on column public.distributor_barang.kategori is
  'Tipe alkes distributor: STENT, BALLON, WIRE, GUIDING, KATETER (validasi di aplikasi).';
comment on column public.distributor_barang.lot is 'Nomor batch / LOT supplier.';
comment on column public.distributor_barang.ukuran is 'Ukuran produk (teks bebas untuk RS).';
comment on column public.distributor_barang.ed is 'Kedaluwarsa bulan-tahun (MM-YYYY), contoh 09-2028.';
