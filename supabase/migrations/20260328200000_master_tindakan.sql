-- Master jenis tindakan Cathlab (pilihan kolom tindakan di kasus & form terkait)

create table if not exists public.master_tindakan (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nama text not null,
  urutan integer not null default 0,
  aktif boolean not null default true
);

create unique index if not exists idx_master_tindakan_nama_unique
  on public.master_tindakan (nama);

create index if not exists idx_master_tindakan_urutan on public.master_tindakan (urutan, nama);
create index if not exists idx_master_tindakan_aktif on public.master_tindakan (aktif);

comment on table public.master_tindakan is 'Master nama jenis tindakan (Cathlab). Modul: Tindakan.';

create or replace function public.set_master_tindakan_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_master_tindakan_updated_at on public.master_tindakan;
create trigger trg_master_tindakan_updated_at
  before update on public.master_tindakan
  for each row execute procedure public.set_master_tindakan_updated_at();

-- Data awal (idempotent)
insert into public.master_tindakan (nama, urutan, aktif) values
  ('ABLASI', 10, true),
  ('ANGIOPLASTY', 20, true),
  ('ARTERIOGRAPHY', 30, true),
  ('CHEMOPORT', 40, true),
  ('DCA', 50, true),
  ('DOUBLE LUMEN', 60, true),
  ('DSA', 70, true),
  ('EP STUDY', 80, true),
  ('EVLA', 90, true),
  ('FFR', 100, true),
  ('PE', 110, true),
  ('PERICARDIOSINTESIS', 120, true),
  ('PPCI', 130, true),
  ('PPM', 140, true),
  ('PTCA', 150, true),
  ('PTE', 160, true),
  ('ROTA', 170, true),
  ('TPM', 180, true),
  ('VENOGRAPHY', 190, true)
on conflict (nama) do nothing;
