-- Template checklist tab Obat/Alkes & Komponen cathlab (JSON disimpan per order).

alter table public.cathlab_pemakaian_order
  add column if not exists template_input_barang jsonb not null default '{}'::jsonb;

comment on column public.cathlab_pemakaian_order.template_input_barang is
  'Isian template: { "obatAlkes": { "oa-1": "a|b" }, "komponen": { "k-1": "qty" } } (nilai multi-slot dipisah |).';
