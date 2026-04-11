-- Tambah kolom pci_report_link ke tabel tindakan untuk menyimpan link laporan Google Docs.
-- Selaras dengan KlinisAutosaveField dan TindakanDetailDrawer.

alter table public.tindakan add column if not exists pci_report_link text;

comment on column public.tindakan.pci_report_link is 'Link laporan PCI (Google Docs).';
