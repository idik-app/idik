-- Snapshot flow sheet ICU per baris tindakan (grid + deret waktu + field statis di payload).

create table if not exists public.intensive_flow_sheet (
  id uuid primary key default gen_random_uuid(),
  tindakan_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (tindakan_id)
);

create index if not exists intensive_flow_sheet_tindakan_id_idx
  on public.intensive_flow_sheet (tindakan_id);

comment on table public.intensive_flow_sheet is
  'Data monitoring ICU (flow sheet): payload berisi { "data": { paramId -> { ts|static -> value } } }.';

alter table public.intensive_flow_sheet enable row level security;
