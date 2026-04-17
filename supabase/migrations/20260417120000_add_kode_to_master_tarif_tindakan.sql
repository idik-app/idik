-- Add kode column to master_tarif_tindakan
alter table public.master_tarif_tindakan add column if not exists kode text;

comment on column public.master_tarif_tindakan.kode is 'Kode tindakan (mis. ICD-9-CM) untuk keperluan tarif/klaim.';
