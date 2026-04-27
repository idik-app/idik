-- Role audit Cathlab / IDIK (login JWT → /idik/dashboard, middleware unit path).

alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check check (role in (
    'pasien',
    'dokter',
    'perawat',
    'cathlab',
    'it',
    'radiografer',
    'casemix',
    'distributor',
    'depo_farmasi',
    'admin',
    'administrator',
    'superadmin'
  ));

comment on column public.app_users.role is
  'Audit level: pasien,dokter,perawat,cathlab,it,radiografer,casemix,distributor,depo_farmasi,admin,administrator,superadmin';
