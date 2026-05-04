-- Pastikan semua kolom yang dipakai drawer detail kasus / PATCH API / list projection
-- ada di public.tindakan (idempotent). Selaras wireframeDrawerTabs + PATCHABLE_TINDAKAN_KEYS +
-- proyeksi app/api/tindakan/route.ts (SAFE_TINDAKAN_COLUMNS).
--
-- Verifikasi manual setelah push:
--   select column_name, data_type
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'tindakan'
--   order by ordinal_position;

-- --- Denormalisasi & legacy daftar kasus (Supabase select projection) ---
alter table public.tindakan add column if not exists dokter text;
alter table public.tindakan add column if not exists operator text;
alter table public.tindakan add column if not exists nama text;
alter table public.tindakan add column if not exists nama_pasien text;
alter table public.tindakan add column if not exists no_rekam_medis text;
alter table public.tindakan add column if not exists jenis text;
alter table public.tindakan add column if not exists alkes_utama text;
alter table public.tindakan add column if not exists inserted_at timestamptz default now();
alter table public.tindakan add column if not exists jenis_kelamin text;
alter table public.tindakan add column if not exists umur numeric;

-- --- Lokasi & identitas kasus ---
alter table public.tindakan add column if not exists ruangan text;
alter table public.tindakan add column if not exists no_rm text;
alter table public.tindakan add column if not exists cath text;
alter table public.tindakan add column if not exists kategori text;
alter table public.tindakan add column if not exists status text;

-- --- Tarif / biaya (tab Biaya) ---
alter table public.tindakan add column if not exists tarif_tindakan numeric(14, 2);
alter table public.tindakan add column if not exists total numeric(14, 2);
alter table public.tindakan add column if not exists krs text;
alter table public.tindakan add column if not exists selisih numeric(14, 2);
alter table public.tindakan add column if not exists consumable numeric(14, 2);
alter table public.tindakan add column if not exists pemakaian text;
alter table public.tindakan add column if not exists kelas_pembiayaan text;

-- --- Klinis & rencana (tab Tindakan / Klinis) ---
alter table public.tindakan add column if not exists diagnosa text;
alter table public.tindakan add column if not exists hasil_lab_ppm text;
alter table public.tindakan add column if not exists severity_level text;
alter table public.tindakan add column if not exists pci_report_link text;
alter table public.tindakan add column if not exists faktor_risiko text;
alter table public.tindakan add column if not exists temuan_pembuluh text;
alter table public.tindakan add column if not exists kesimpulan_laporan text;
alter table public.tindakan add column if not exists plan_medis text;

-- --- Fast-track ---
alter table public.tindakan add column if not exists is_fast_track boolean default false;
alter table public.tindakan add column if not exists pasien_datang_igd text;
alter table public.tindakan add column if not exists door_to_balloon text;
alter table public.tindakan add column if not exists total_waktu_fast_track text;
alter table public.tindakan add column if not exists fast_track_sign_in text;
alter table public.tindakan add column if not exists fast_track_time_out text;
alter table public.tindakan add column if not exists fast_track_sign_out text;
alter table public.tindakan add column if not exists fast_track_fotos text;

-- --- Tim perawat ---
alter table public.tindakan add column if not exists asisten text;
alter table public.tindakan add column if not exists sirkuler text;
alter table public.tindakan add column if not exists logger text;

-- --- Radiologi / mesin (tab Radiologi; dose = Air kerma di UI) ---
alter table public.tindakan add column if not exists fluoro_time numeric;
alter table public.tindakan add column if not exists dose numeric;
alter table public.tindakan add column if not exists kv numeric;
alter table public.tindakan add column if not exists ma numeric;
alter table public.tindakan add column if not exists dap_gy_cm2 numeric;
alter table public.tindakan add column if not exists air_kerma numeric;
alter table public.tindakan add column if not exists dap_dose numeric;
alter table public.tindakan add column if not exists total_kontras text;
alter table public.tindakan add column if not exists waktu text;

-- --- Kelengkapan ---
alter table public.tindakan add column if not exists asmed text;
alter table public.tindakan add column if not exists resume_erm text;
alter table public.tindakan add column if not exists sjp text;
alter table public.tindakan add column if not exists berkas_laporan text;
alter table public.tindakan add column if not exists consumable_kelengkapan text;
alter table public.tindakan add column if not exists billing_simrs text;
alter table public.tindakan add column if not exists pj_laporan text;
alter table public.tindakan add column if not exists operan_ranap text;

-- --- Lain-lain PATCH ---
alter table public.tindakan add column if not exists rs_perujuk text;
alter table public.tindakan add column if not exists keterangan text;

comment on table public.tindakan is
  'Tindakan medis Cathlab IDIK-App — kolom drawer/API dilengkapi oleh migrasi ensure_* dan migrasi fitur.';
