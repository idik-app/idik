-- Idempotent: pastikan kolom barcode ada (beberapa environment / branch bisa kehilangan langkah migrasi sebelumnya).
alter table public.distributor_barang
  add column if not exists barcode text;

comment on column public.distributor_barang.barcode is
  'Barcode kemasan yang diinput/discan distributor; disimpan bersama mapping produk.';
