-- Beberapa DB sudah punya tabel `pemakaian` tanpa kolom inventaris_id (skema lama).
-- Tanpa kolom ini, FIFO dan API distributor tidak bisa mengaitkan ke stok inventaris.

alter table public.pemakaian
  add column if not exists inventaris_id uuid references public.inventaris (id) on delete restrict;

create index if not exists idx_pemakaian_inventaris_id on public.pemakaian (inventaris_id);
