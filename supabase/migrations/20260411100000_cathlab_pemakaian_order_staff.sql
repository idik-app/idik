-- Penambahan kolom Petugas CSSD dan Asisten Cathlab pada order pemakaian alkes.
-- Mengakomodasi kebutuhan log elektrofisiologi dari Google Sheets.

alter table public.cathlab_pemakaian_order
add column if not exists petugas_cssd text,
add column if not exists asisten_cathlab text;

comment on column public.cathlab_pemakaian_order.petugas_cssd is 'Nama petugas penyiapan alat/sterilisasi CSSD.';
comment on column public.cathlab_pemakaian_order.asisten_cathlab is 'Nama perawat/asisten pendamping tindakan di Cathlab.';
