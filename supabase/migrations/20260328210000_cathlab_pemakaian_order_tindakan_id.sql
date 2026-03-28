-- Relasi order pemakaian ↔ baris kasus tindakan (deep link & edit dari modul Tindakan).
alter table public.cathlab_pemakaian_order
  add column if not exists tindakan_id text;

create index if not exists idx_cathlab_pemakaian_order_tindakan_id
  on public.cathlab_pemakaian_order (tindakan_id)
  where tindakan_id is not null and length(trim(tindakan_id)) > 0;

comment on column public.cathlab_pemakaian_order.tindakan_id is
  'ID baris public.tindakan (teks) saat order dibuat dari kasus tindakan; untuk edit & indeks.';
