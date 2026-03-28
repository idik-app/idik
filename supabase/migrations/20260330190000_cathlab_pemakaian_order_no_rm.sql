-- Nomor rekam medis terpisah dari teks label pasien (kolom `pasien` tetap bisa berisi "Nama (RM)" untuk kompatibilitas).

alter table public.cathlab_pemakaian_order
  add column if not exists no_rm text;

comment on column public.cathlab_pemakaian_order.no_rm is
  'Nomor RM pasien (opsional); disinkron dari input / sufiks label pasien.';

create index if not exists idx_cathlab_pemakaian_order_no_rm
  on public.cathlab_pemakaian_order (no_rm)
  where no_rm is not null and trim(no_rm) <> '';
