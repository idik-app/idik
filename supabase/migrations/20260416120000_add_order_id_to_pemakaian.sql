-- Add cathlab_pemakaian_order_id to pemakaian table to track which order caused the allocation.
alter table public.pemakaian
  add column if not exists cathlab_pemakaian_order_id text references public.cathlab_pemakaian_order (id) on delete set null;

create index if not exists idx_pemakaian_cathlab_pemakaian_order_id
  on public.pemakaian (cathlab_pemakaian_order_id);

comment on column public.pemakaian.cathlab_pemakaian_order_id is
  'ID order dari dashboard Cathlab yang memicu alokasi FIFO ini (untuk sinkronisasi/reverse).';
