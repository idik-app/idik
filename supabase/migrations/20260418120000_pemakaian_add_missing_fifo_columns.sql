-- Skema parsial: `pemakaian` ada tanpa `keterangan`, padahal `allocate_pemakaian_fifo`
-- melakukan INSERT ke kolom tersebut.

alter table public.pemakaian
  add column if not exists keterangan text;

comment on column public.pemakaian.keterangan is
  'Catatan baris FIFO (mis. referensi order pemakaian).';
