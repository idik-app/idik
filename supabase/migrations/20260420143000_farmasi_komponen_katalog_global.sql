-- Katalog komponen cathlab (global): diedit di /dashboard/farmasi/master-barang,
-- dipakai sebagai saran nama di input pemakaian. Satu baris id = 1.

create table if not exists public.farmasi_komponen_katalog_global (
  id smallint primary key default 1 check (id = 1),
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.farmasi_komponen_katalog_global (id, rows)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

comment on table public.farmasi_komponen_katalog_global is
  'Daftar komponen cathlab (distributor + kategori + nama) untuk saran autocomplete pemakaian; singleton id=1.';

alter table public.farmasi_komponen_katalog_global enable row level security;

drop policy if exists "Service role only farmasi_komponen_katalog_global"
  on public.farmasi_komponen_katalog_global;

create policy "Service role only farmasi_komponen_katalog_global"
  on public.farmasi_komponen_katalog_global
  for all
  using (auth.role() = 'service_role');
