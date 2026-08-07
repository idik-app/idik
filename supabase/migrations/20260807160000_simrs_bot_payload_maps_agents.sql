-- Bot SIMRS: payload jobs, field maps (ajar), recipe steps, multi-agen registry, batch parent

alter table public.simrs_bot_jobs
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.simrs_bot_jobs
  add column if not exists agent_id text;

alter table public.simrs_bot_jobs
  add column if not exists rs_id text;

alter table public.simrs_bot_jobs
  add column if not exists parent_job_id uuid references public.simrs_bot_jobs (id) on delete set null;

comment on column public.simrs_bot_jobs.payload is
  'Parameter job: no_rm, tindakan_id, field_key, recipe, mode, steps, notes, batch, dll.';

create index if not exists simrs_bot_jobs_agent_status_idx
  on public.simrs_bot_jobs (agent_id, status, created_at asc);

create index if not exists simrs_bot_jobs_parent_idx
  on public.simrs_bot_jobs (parent_job_id);

-- Mapping ajar field idik → SIMRS (global per field_key)
create table if not exists public.simrs_bot_field_maps (
  field_key text primary key,
  recipe text not null default 'erm_ri_perawat',
  notes text,
  simrs_selector text,
  simrs_label text,
  recipe_steps jsonb not null default '[]'::jsonb,
  value_format text,
  updated_at timestamptz not null default now(),
  updated_by text
);

comment on table public.simrs_bot_field_maps is
  'Hasil ajar bot: resep + selector/step SIMRS per field_key idik.';

alter table public.simrs_bot_field_maps enable row level security;

-- Registry agen PC RS
create table if not exists public.simrs_bot_agents (
  agent_id text primary key,
  rs_id text not null default 'default',
  label text,
  last_seen_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.simrs_bot_agents is
  'Heartbeat agen Playwright per RS (multi-agen).';

alter table public.simrs_bot_agents enable row level security;

-- Workflow recipes (lapisan atas editor DnD)
create table if not exists public.simrs_bot_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  recipe_key text not null unique,
  steps jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

comment on table public.simrs_bot_workflows is
  'Resep workflow generik (editor admin) — output recipe_steps untuk runtime.';

alter table public.simrs_bot_workflows enable row level security;
