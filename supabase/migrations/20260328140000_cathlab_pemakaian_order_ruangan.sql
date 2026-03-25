-- Ruangan / lokasi tindakan untuk order pemakaian (tampil di daftar & cetak).
alter table public.cathlab_pemakaian_order
  add column if not exists ruangan text not null default '';

comment on column public.cathlab_pemakaian_order.ruangan is
  'Ruangan / lokasi tindakan (mis. Cath Lab 1, OKI).';
