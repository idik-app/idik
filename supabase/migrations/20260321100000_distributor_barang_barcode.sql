-- Barcode kemasan level mapping distributor (boleh beda dari master_barang.barcode).

alter table public.distributor_barang
  add column if not exists barcode text;

comment on column public.distributor_barang.barcode is
  'Barcode kemasan yang diinput/discan distributor; disimpan bersama mapping produk.';
