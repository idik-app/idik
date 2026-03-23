-- Perluas role app_users ke 9 level audit IDIK-App.
-- Ref: docs/AUDIT_LEVEL_IDIK.md

-- Backfill role lama ke role baru sebelum ubah constraint
update public.app_users set role = 'pasien'   where role = 'user';
update public.app_users set role = 'perawat' where role = 'staff';

-- Hapus constraint lama (nama default dari create table)
alter table public.app_users
  drop constraint if exists app_users_role_check;

-- Constraint baru: 9 role
alter table public.app_users
  add constraint app_users_role_check check (role in (
    'pasien',
    'dokter',
    'perawat',
    'it',
    'radiografer',
    'casemix',
    'admin',
    'administrator',
    'superadmin'
  ));

-- Default untuk insert baru (opsional)
alter table public.app_users
  alter column role set default 'pasien';

comment on column public.app_users.role is 'Audit level: pasien,dokter,perawat,it,radiografer,casemix,admin,administrator,superadmin';
