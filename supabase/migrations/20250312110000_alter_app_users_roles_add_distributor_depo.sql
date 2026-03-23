-- Tambah role level 10 & 11: distributor, depo_farmasi.
-- Ref: docs/AUDIT_LEVEL_IDIK.md

-- Pastikan data lama tidak melanggar constraint baru
update public.app_users set role = 'distributor'  where role = 'vendor';
update public.app_users set role = 'depo_farmasi' where role in ('depo', 'farmasi', 'pharmacy');

alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check check (role in (
    'pasien',
    'dokter',
    'perawat',
    'it',
    'radiografer',
    'casemix',
    'distributor',
    'depo_farmasi',
    'admin',
    'administrator',
    'superadmin'
  ));

comment on column public.app_users.role is 'Audit level: pasien,dokter,perawat,it,radiografer,casemix,distributor,depo_farmasi,admin,administrator,superadmin';
