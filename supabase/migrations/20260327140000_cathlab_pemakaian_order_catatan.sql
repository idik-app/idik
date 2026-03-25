-- Catatan klinis / instruksi ke Depo (form Input Pemakaian)

alter table public.cathlab_pemakaian_order
  add column if not exists catatan text;

comment on column public.cathlab_pemakaian_order.catatan is
  'Catatan opsional dari form Input Pemakaian (ke Depo Farmasi).';
