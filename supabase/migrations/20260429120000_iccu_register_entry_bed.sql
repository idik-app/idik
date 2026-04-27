-- Posisi tempat tidur pasien (label/kode per unit, mis. A-1, ICCU-3)
alter table public.iccu_register_entry
  add column if not exists bed text;

comment on column public.iccu_register_entry.bed is
  'Kode/label posisi tempat tidur di ruangan (ditampilkan di kolom BED register ICCU).';
