-- Tabel pemakaian — pencatatan pemakaian alkes (modul Pemakaian)

create table if not exists public.pemakaian (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  inventaris_id uuid references public.inventaris (id) on delete restrict,
  jumlah numeric not null,
  tanggal date default current_date,
  keterangan text,
  tindakan_id uuid references public.tindakan (id) on delete set null
);

create index if not exists idx_pemakaian_tanggal on public.pemakaian (tanggal desc);
create index if not exists idx_pemakaian_inventaris_id on public.pemakaian (inventaris_id);

comment on table public.pemakaian is 'Pemakaian alkes per tindakan/tanggal. Modul: Pemakaian.';
