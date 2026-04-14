-- ==========================================================
-- IDIK-App Core Database Schema (Cathlab + Inventory)
-- ==========================================================
-- Versi: 1.1 (Unified Audit Log)
-- Author: JARVIS IDIK
-- ==========================================================

-- ========= ENUM TYPES =========
create type device_status as enum ('new', 'reuse');
create type user_role as enum ('admin', 'doctor', 'nurse', 'radiographer');
create type action_category as enum ('Diagnostic', 'PCI', 'CTO', 'Primary PCI', 'Others');

-- ========= MASTER: DOCTORS =========
create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialization text,
  phone text,
  email text,
  created_at timestamptz default now()
);

-- ========= MASTER: PATIENTS =========
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  rm_number varchar(20) unique not null,
  name text not null,
  birth_date date,
  gender varchar(10),
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========= MASTER: DISTRIBUTORS =========
create table if not exists public.distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  created_at timestamptz default now()
);

-- ========= INVENTORY: DEVICES =========
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text,
  lot_number text,
  expiry_date date,
  status device_status default 'new',
  stock integer default 0,
  min_stock integer default 0,
  unit text,
  distributor_id uuid references distributors(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========= CATHLAB PROCEDURES =========
create table if not exists public.procedures (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete set null,
  category action_category default 'Diagnostic',
  action_name text,
  action_date timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- ========= DEVICE USAGE LOG =========
create table if not exists public.device_usage (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid references procedures(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  quantity integer default 1,
  status device_status default 'new',
  used_at timestamptz default now()
);

-- ========= AUDIT LOG (UNIFIED) =========
-- Gabungan dari kebutuhan trigger DB dan audit internal aplikasi.
create table if not exists public.audit_log (
  id bigserial primary key,
  event_type text,      -- Misal: 'pasien', 'tindakan', 'auth'
  action text,          -- Misal: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
  module text,          -- Misal: 'dashboard/pasien', 'api/auth'
  actor text,           -- ID user atau email sistem
  metadata jsonb default '{}'::jsonb,
  status text default 'success',
  ip_address text,
  created_at timestamptz default now()
);

-- ========= TRIGGER UNTUK AUDIT LOG =========
create or replace function public.log_table_change()
returns trigger as $$
begin
  insert into audit_log (event_type, action, module, actor, metadata, status, created_at)
  values (
    TG_TABLE_NAME,
    TG_OP,
    'DB_TRIGGER',
    coalesce(current_setting('request.jwt.claim.email', true), 'system'),
    jsonb_build_object(
      'row_id', coalesce(NEW.id, OLD.id),
      'description', concat('Change detected on ', TG_TABLE_NAME)
    ),
    'success',
    now()
  );
  return null;
end;
$$ language plpgsql security definer;

-- Terapkan trigger audit pada tabel penting
do $$
declare
  t text;
begin
  for t in select unnest(array['patients','devices','procedures','device_usage'])
  loop
    execute format(
      'create trigger %I_audit after insert or update or delete on %I
       for each row execute function public.log_table_change();', t, t
    );
  end loop;
exception when others then
  -- Ignore if trigger already exists
end;
$$;

-- ========= FUNCTION: GET TABLE SCHEMA (untuk Explorer) =========
create or replace function public.get_table_schema(tname text)
returns table(column_name text, data_type text)
language sql stable as $$
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = tname
  order by ordinal_position;
$$;

grant execute on function public.get_table_schema(text) to authenticated;

-- ========= INDEXES =========
create index if not exists idx_patients_rm on patients(rm_number);
create index if not exists idx_devices_lot on devices(lot_number);
create index if not exists idx_device_expiry on devices(expiry_date);
create index if not exists idx_usage_procedure on device_usage(procedure_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);
create index if not exists idx_audit_log_event_type on audit_log(event_type);

-- ========= RLS (Row-Level Security) =========
alter table public.patients enable row level security;
alter table public.devices enable row level security;
alter table public.device_usage enable row level security;
alter table public.procedures enable row level security;
alter table public.audit_log enable row level security;

create policy "allow read for all authenticated" on public.patients
  for select using (auth.role() = 'authenticated');

create policy "allow read for all authenticated" on public.devices
  for select using (auth.role() = 'authenticated');

create policy "allow read for all authenticated" on public.distributors
  for select using (auth.role() = 'authenticated');

create policy "allow read for all authenticated" on public.audit_log
  for select using (auth.role() = 'authenticated');
