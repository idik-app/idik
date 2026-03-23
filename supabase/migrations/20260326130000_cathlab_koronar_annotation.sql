-- Anotasi koronar 3D (JSON payload) — disimpan via API + service role

create table if not exists public.cathlab_koronar_annotation (
  id uuid primary key default gen_random_uuid(),
  created_by text not null,
  -- Tanpa FK: id pasien di proyek bisa uuid (lokal) atau integer (remote).
  pasien_id text,
  title text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cathlab_koronar_annotation_created_at
  on public.cathlab_koronar_annotation (created_at desc);

create index if not exists idx_cathlab_koronar_annotation_created_by
  on public.cathlab_koronar_annotation (created_by);

comment on table public.cathlab_koronar_annotation is
  'Anotasi pohon koroner 3D (prototipe). Akses hanya lewat API (service role).';

alter table public.cathlab_koronar_annotation enable row level security;

create policy "cathlab_koronar_annotation service role"
  on public.cathlab_koronar_annotation
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
