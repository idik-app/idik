-- Tabel ruangan — master ruangan / bed Cathlab IDIK-App

create table if not exists public.ruangan (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nama text not null,
  kode text,
  kategori text,
  kapasitas integer,
  keterangan text,
  aktif boolean default true
);

create index if not exists idx_ruangan_nama on public.ruangan (nama);
create index if not exists idx_ruangan_kategori on public.ruangan (kategori);
create index if not exists idx_ruangan_aktif on public.ruangan (aktif);

-- Satu kode unik jika diisi (boleh null / kosong di aplikasi)
create unique index if not exists idx_ruangan_kode_unique
  on public.ruangan (kode)
  where kode is not null and length(trim(kode)) > 0;

comment on table public.ruangan is 'Master ruangan / kamar Cathlab IDIK-App. Modul: Ruangan.';

create or replace function public.set_ruangan_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ruangan_updated_at on public.ruangan;
create trigger trg_ruangan_updated_at
  before update on public.ruangan
  for each row execute procedure public.set_ruangan_updated_at();
