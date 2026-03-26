-- Skema lama: tabel pemakaian tanpa kolom jumlah (FIFO & API mengharapkan numeric).

alter table public.pemakaian
  add column if not exists jumlah numeric not null default 1;

comment on column public.pemakaian.jumlah is 'Kuantitas pemakaian alkes (per baris FIFO).';
