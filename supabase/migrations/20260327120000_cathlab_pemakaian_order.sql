-- Order pemakaian / resep alkes (dashboard Cathlab) — terpisah dari tabel public.pemakaian (FIFO inventaris).

create table if not exists public.cathlab_pemakaian_order (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  mode text not null default 'PEMAKAIAN' check (mode in ('RESEP', 'PEMAKAIAN')),
  tanggal text not null,
  pasien text not null,
  dokter text not null,
  depo text not null,
  status text not null check (
    status in ('DRAFT', 'DIAJUKAN', 'MENUNGGU_VALIDASI', 'TERVERIFIKASI')
  ),
  items jsonb not null default '[]'::jsonb
);

create index if not exists idx_cathlab_pemakaian_order_created_at
  on public.cathlab_pemakaian_order (created_at desc);

comment on table public.cathlab_pemakaian_order is
  'Daftar order pemakaian/resep alkes Cathlab (UI dashboard).';

-- Seed awal (sama dengan demo INITIAL_ORDERS di app)
insert into public.cathlab_pemakaian_order (id, tanggal, pasien, dokter, depo, status, items, mode)
values
(
  'ORD-001',
  '2025-03-16 09:30',
  'Budi Santoso',
  'dr. Andi, SpJP',
  'Depo Cathlab',
  'TERVERIFIKASI',
  $$[
    {"lineId":"ORD-001-A","barang":"Stent DES 3.0 x 28mm","distributor":"PT Alkes Sejahtera","qtyRencana":2,"qtyDipakai":1,"tipe":"BARU"},
    {"lineId":"ORD-001-B","barang":"Guidewire 0.014\"","distributor":"PT Kardiotek","qtyRencana":1,"qtyDipakai":1,"tipe":"REUSE"}
  ]$$::jsonb,
  'PEMAKAIAN'
),
(
  'ORD-002',
  '2025-03-16 10:15',
  'Siti Aminah',
  'dr. Rudi, SpJP',
  'Depo Cathlab',
  'MENUNGGU_VALIDASI',
  $$[
    {"lineId":"ORD-002-A","barang":"Guidewire 0.014\"","distributor":"PT Kardiotek","qtyRencana":1,"qtyDipakai":1,"tipe":"REUSE"}
  ]$$::jsonb,
  'PEMAKAIAN'
),
(
  'ORD-003',
  '2025-03-16 11:00',
  'Ahmad Wijaya',
  'dr. Lisa, SpJP',
  'Depo Cathlab',
  'DIAJUKAN',
  $$[
    {"lineId":"ORD-003-A","barang":"Balloon NC 2.0 x 15mm","distributor":"PT Alkes Sejahtera","qtyRencana":1,"qtyDipakai":1,"tipe":"BARU"}
  ]$$::jsonb,
  'PEMAKAIAN'
),
(
  'ORD-004',
  '2025-03-16 13:20',
  'Dewi Lestari',
  'dr. Andi, SpJP',
  'Depo Cathlab',
  'DRAFT',
  $$[
    {"lineId":"ORD-004-A","barang":"Introducer 6F","distributor":"PT Kardiotek","qtyRencana":1,"qtyDipakai":0,"tipe":"BARU"}
  ]$$::jsonb,
  'PEMAKAIAN'
),
(
  'ORD-005',
  '2025-03-16 14:05',
  'Rina Kusuma',
  'dr. Rudi, SpJP',
  'Depo Cathlab',
  'TERVERIFIKASI',
  $$[
    {"lineId":"ORD-005-A","barang":"Stent DES 2.5 x 18mm","distributor":"PT Alkes Sejahtera","qtyRencana":1,"qtyDipakai":1,"tipe":"REUSE"}
  ]$$::jsonb,
  'PEMAKAIAN'
)
on conflict (id) do nothing;
