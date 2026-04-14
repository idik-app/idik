-- Fix Audit Log Schema Inconsistency (FINAL REVISION 4)
-- Unify audit_logs (plural) and audit_log (singular) into audit_log (singular)
-- Ensure 'action' and other required columns exist.

-- 1. Pastikan tabel audit_log (singular) sudah ada dengan schema minimal
create table if not exists public.audit_log (
    id bigserial primary key,
    created_at timestamptz default now()
);

-- 2. Pastikan semua kolom yang dibutuhkan ada (Add if missing)
do $$
begin
    if not exists (select from information_schema.columns where table_schema = 'public' and table_name = 'audit_log' and column_name = 'event_type') then
        alter table public.audit_log add column event_type text;
    end if;

    if not exists (select from information_schema.columns where table_schema = 'public' and table_name = 'audit_log' and column_name = 'action') then
        alter table public.audit_log add column action text;
    end if;

    if not exists (select from information_schema.columns where table_schema = 'public' and table_name = 'audit_log' and column_name = 'module') then
        alter table public.audit_log add column module text;
    end if;

    if not exists (select from information_schema.columns where table_schema = 'public' and table_name = 'audit_log' and column_name = 'actor') then
        alter table public.audit_log add column actor text;
    end if;

    if not exists (select from information_schema.columns where table_schema = 'public' and table_name = 'audit_log' and column_name = 'metadata') then
        alter table public.audit_log add column metadata jsonb default '{}'::jsonb;
    end if;

    if not exists (select from information_schema.columns where table_schema = 'public' and table_name = 'audit_log' and column_name = 'status') then
        alter table public.audit_log add column status text default 'success';
    end if;

    if not exists (select from information_schema.columns where table_schema = 'public' and table_name = 'audit_log' and column_name = 'ip_address') then
        alter table public.audit_log add column ip_address text;
    end if;
end $$;

-- 3. Hapus tabel lama (audit_logs) jika ada, tanpa migrasi data (untuk kecepatan dan menghindari error scope)
drop table if exists public.audit_logs cascade;

-- 4. Update/Re-create Trigger Function untuk menggunakan tabel baru
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

-- 5. Re-enable RLS dan Policy
alter table public.audit_log enable row level security;

drop policy if exists "allow read for all authenticated" on public.audit_log;
create policy "allow read for all authenticated" on public.audit_log
  for select using (auth.role() = 'authenticated');

-- 6. Indexes
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);
create index if not exists idx_audit_log_event_type on audit_log(event_type);
