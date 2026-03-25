-- Memperbaiki error PostgREST:
-- "Could not find the 'status' column of 'doctor' in the schema cache"
--
-- Beberapa database lama / skema ERD memakai `status_aktif` tanpa kolom `status`.
-- Aplikasi memakai `status` (boolean): true = aktif, false = nonaktif/cuti.

alter table public.doctor add column if not exists status boolean default true;

-- Sinkron dari status_aktif jika kolom itu ada (skema ERD v3.1).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'doctor'
      and column_name = 'status_aktif'
  ) then
    execute 'update public.doctor set status = coalesce(status_aktif, true)';
  end if;
end $$;

create index if not exists idx_doctor_status on public.doctor (status);

comment on column public.doctor.status is 'Aktifitas dokter: true = aktif, false = nonaktif atau cuti.';
