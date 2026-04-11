-- Tambah kolom klinis ke tabel pasien agar data bisa tersimpan otomatis per pasien (master).
-- Selaras dengan KlinisAutosaveField dan TindakanDetailDrawer.

alter table public.pasien add column if not exists pci_report_link text;
alter table public.pasien add column if not exists diagnosa text;
alter table public.pasien add column if not exists severity_level text;
alter table public.pasien add column if not exists hasil_lab_ppm text;

comment on column public.pasien.pci_report_link is 'Link laporan PCI terakhir pasien (Google Docs).';
comment on column public.pasien.diagnosa is 'Diagnosis klinis terakhir pasien.';
comment on column public.pasien.severity_level is 'Tingkat keparahan klinis terakhir pasien.';
comment on column public.pasien.hasil_lab_ppm is 'Hasil lab/PPM terakhir pasien.';
