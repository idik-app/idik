-- Tanggal khusus status tindakan (mis. tanggal meninggal saat status = Meninggal)
alter table public.tindakan add column if not exists status_tanggal text;

comment on column public.tindakan.status_tanggal is
  'Tanggal khusus terkait status tindakan (mis. tanggal meninggal atau perubahan status).';
