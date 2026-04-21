-- Dua versi allocate_pemakaian_fifo (p_tindakan_id uuid vs bigint) membuat Postgres
-- gagal memilih fungsi saat RPC. Hapus semua overload yang memakai uuid untuk tindakan_id.

-- Versi dengan cathlab_pemakaian_order_id (7 arg), tindakan_id uuid
drop function if exists public.allocate_pemakaian_fifo(
  uuid,
  numeric,
  text,
  uuid,
  text,
  date,
  text
);

-- Versi lama tanpa p_order_id (6 arg), tindakan_id uuid
drop function if exists public.allocate_pemakaian_fifo(
  uuid,
  numeric,
  text,
  uuid,
  text,
  date
);
