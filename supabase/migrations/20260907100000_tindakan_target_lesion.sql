-- Target Lesion per kasus tindakan & master pasien

alter table public.tindakan add column if not exists target_lesion text;
alter table public.pasien add column if not exists target_lesion text;

comment on column public.tindakan.target_lesion is
  'Target Lesion untuk kasus tindakan / PCI (mis. LAD, RCA, LMA, LCx, dsb).';
comment on column public.pasien.target_lesion is
  'Target Lesion untuk master pasien.';
