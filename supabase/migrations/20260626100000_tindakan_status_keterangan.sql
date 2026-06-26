-- Keterangan khusus status tindakan (mis. alasan pembatalan saat status = Dibatalkan)
alter table public.tindakan add column if not exists status_keterangan text;

comment on column public.tindakan.status_keterangan is
  'Keterangan tambahan terkait status tindakan (mis. alasan pembatalan).';
