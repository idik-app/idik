-- Tambah kolom metrik radiologi dan klinis yang lebih spesifik ke tabel tindakan dan pasien.
-- Selaras dengan label "Air kerma (mGy)" dan "DAP (mGy·cm)" di UI.

-- 1. Tabel Tindakan
alter table public.tindakan add column if not exists air_kerma numeric;
alter table public.tindakan add column if not exists dap_dose numeric;
alter table public.tindakan add column if not exists faktor_risiko text;
alter table public.tindakan add column if not exists temuan_pembuluh text;
alter table public.tindakan add column if not exists kesimpulan_laporan text;
alter table public.tindakan add column if not exists plan_medis text;
alter table public.tindakan add column if not exists total_kontras text;
alter table public.tindakan add column if not exists hasil_lab_ppm text;
alter table public.tindakan add column if not exists severity_level text;
alter table public.tindakan add column if not exists asisten text;
alter table public.tindakan add column if not exists sirkuler text;
alter table public.tindakan add column if not exists logger text;

comment on column public.tindakan.air_kerma is 'Air kerma (mGy).';
comment on column public.tindakan.dap_dose is 'Dose Area Product (mGy·cm).';
comment on column public.tindakan.faktor_risiko is 'Faktor risiko klinis pasien.';
comment on column public.tindakan.temuan_pembuluh is 'Detail anatomi / temuan pembuluh (LM, LAD, RCA, dll).';
comment on column public.tindakan.kesimpulan_laporan is 'Hasil akhir / kesimpulan laporan medis.';
comment on column public.tindakan.plan_medis is 'Rencana lanjutan / plan medis.';
comment on column public.tindakan.total_kontras is 'Total kontras yang digunakan (ml).';

-- 2. Tabel Pasien (Master History)
alter table public.pasien add column if not exists faktor_risiko text;
alter table public.pasien add column if not exists temuan_pembuluh text;
alter table public.pasien add column if not exists kesimpulan_laporan text;
alter table public.pasien add column if not exists plan_medis text;
alter table public.pasien add column if not exists total_kontras text;
alter table public.pasien add column if not exists air_kerma numeric;
alter table public.pasien add column if not exists dap_dose numeric;

comment on column public.pasien.faktor_risiko is 'Faktor risiko klinis terakhir pasien.';
comment on column public.pasien.temuan_pembuluh is 'Detail anatomi terakhir pasien.';
comment on column public.pasien.kesimpulan_laporan is 'Hasil akhir laporan terakhir pasien.';
comment on column public.pasien.plan_medis is 'Rencana medis terakhir pasien.';
