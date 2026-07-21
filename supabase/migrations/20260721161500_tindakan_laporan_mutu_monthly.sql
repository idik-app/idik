-- Penyimpanan laporan MUTU bulanan Cathlab per unit.
-- Diakses melalui API server dengan service role.

create table if not exists public.tindakan_laporan_mutu_monthly (
  id uuid primary key default gen_random_uuid(),
  unit_slug text not null,
  month_yyyymm text not null,
  room_name text not null default 'IDIK',
  day_count integer not null default 31,
  reports jsonb not null default '{}'::jsonb,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tindakan_laporan_mutu_monthly_unit_month_unique
    unique (unit_slug, month_yyyymm),
  constraint tindakan_laporan_mutu_monthly_month_format
    check (month_yyyymm ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  constraint tindakan_laporan_mutu_monthly_day_count_range
    check (day_count between 1 and 31),
  constraint tindakan_laporan_mutu_monthly_reports_object
    check (jsonb_typeof(reports) = 'object')
);

create index if not exists idx_tindakan_laporan_mutu_monthly_unit_month
  on public.tindakan_laporan_mutu_monthly (unit_slug, month_yyyymm desc);

comment on table public.tindakan_laporan_mutu_monthly is
  'Snapshot editable laporan MUTU bulanan Cathlab per unit; payload JSON memuat 5 tab indikator.';

create or replace function public.set_tindakan_laporan_mutu_monthly_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tindakan_laporan_mutu_monthly_updated_at
  on public.tindakan_laporan_mutu_monthly;

create trigger trg_tindakan_laporan_mutu_monthly_updated_at
  before update on public.tindakan_laporan_mutu_monthly
  for each row execute procedure public.set_tindakan_laporan_mutu_monthly_updated_at();

alter table public.tindakan_laporan_mutu_monthly enable row level security;

create policy "tindakan_laporan_mutu_monthly service role"
  on public.tindakan_laporan_mutu_monthly
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
