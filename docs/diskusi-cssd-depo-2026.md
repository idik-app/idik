# Ringkasan Diskusi Integrasi Data CSSD & Depo IDIK

**Tanggal:** 13 April 2026
**Topik:** Integrasi Data Barang Reuse CSSD, Dashboard Depo, dan Usulan Cathlab MAR 2026.

## 1. Sumber Data Utama
Diskusi ini mengintegrasikan tiga sumber data besar:
1.  **Google Sheets (Data Barang Reuse):** Berisi detail stok awal, masuk, terpakai, dan gagal pakai untuk alat reuse (Ballon Simpas, Genoss, dll).
2.  **Excel Usulan (Cathlab-Usulan MAR 2026):** Daftar alkes kritis (Catheter, Guide Wire, Manifold) dengan catatan khusus seperti "permintaan dr. Deo" atau "tidak dipakai lagi".
3.  **Kode Program (`PemakaianAlkesModal.tsx`):** Logika input pemakaian alkes di kamar tindakan yang membedakan tipe **N (New)**, **R (Reuse)**, dan **B (Billing)**.

## 2. Analisis Integrasi UI & Logika
*   **Otomatisasi Tipe R (Reuse):** Sistem sudah memiliki logika otomatis untuk tindakan `EP STUDY` dan `ABLASI` yang menyarankan alat tipe **R** (Reuse) dari CSSD.
*   **Sinkronisasi Format:** Terdapat regex untuk merapikan format ukuran (misal: `2.0x10` menjadi `2.0 x 10`) agar data di sistem seragam dengan spreadsheet.
*   **Tracking Gagal Pakai:** Mengidentifikasi kebutuhan kolom "Gagal" dan "Penyebab Kegagalan" di UI untuk menjaga kualitas sterilisasi CSSD.

## 3. Wireframe Dashboard CSSD yang Dibutuhkan

### 3.1 Visualisasi Wireframe (Layout Utama)

```text
+--------------------------------------------------------------------------------------------+
| [ IDIK - DASHBOARD CSSD ]                                     [ User: Admin CSSD ] [ 10:45 ] |
+--------------------------------------------------------------------------------------------+
| [≡] [ SIDEBAR ]      | [ MAIN CONTENT ]                                                    |
|                      |                                                                     |
| [ ] Dashboard        |  [ STATS SUMMARY ]                                                  |
| [ ] Barang Reuse     |  +------------------+  +------------------+  +------------------+    |
| [ ] Pemakaian       |  | TOTAL REUSE      |  | SIAP PAKAI (OK)  |  | DALAM PROSES     |    |
| [ ] Laporan Bulanan  |  |      145         |  |      112         |  |      28          |    |
| [ ] Pengaturan       |  +------------------+  +------------------+  +------------------+    |
|                      |                                                                     |
| -------------------- |  [ ACTIONS ]                                                        |
| [ ] Logout           |  [ + TERIMA ALAT ]  [ + GAGAL PAKAI ]  [ EXPORT ]      [ Search... ] |
|                      |                                                                     |
|                      |  [ DAFTAR BARANG REUSE (CSSD) ]                             |
|                      |  +---------------------------------------------------------------+  |
|                      |  | NO | TANGGAL    | NAMA BARANG       | STATUS    | AKSI        |  |
|                      |  |----|------------|-------------------|-----------|-------------|  |
|                      |  | 1  | 13/04/2026 | BALLON Simpas     | STERIL    | [PROSES]    |  |
|                      |  | 2  | 13/04/2026 | Kateter Hisser    | KOTOR     | [STERIL]    |  |
|                      |  | 3  | 12/04/2026 | Optitorque JL 3.5 | STERIL    | [PROSES]    |  |
|                      |  | 4  | 12/04/2026 | Guide Wire Terumo | PROSES    | [SELESAI]   |  |
|                      |  +---------------------------------------------------------------+  |
|                      |                                                                     |
|                      |  [ REAL-TIME PEMAKAIAN (FROM PemakaianAlkesModal.tsx) ]             |
|                      |  +---------------------------------------------------------------+  |
|                      |  | WAKTU | PASIEN           | ALAT                     | STATUS  |  |
|                      |  |-------|------------------|--------------------------|---------|  |
|                      |  | 10:30 | Tn. Dicky Tamara | BALLON Simpas 2.0x12 (R) | TERPAKAI|  |
|                      |  | 09:15 | Ny. Siti Aminah  | Kateter Hisser (R)       | GAGAL   |  |
|                      |  +---------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------+
```

### 3.2 Wireframe UI: Detail Barang Reuse

```text
+--------------------------------------------------------------------------------------------+
| [≡] [ BARANG REUSE ] | [ DETAIL: BALLON SIMPAS 2.0x12 ]                                    |
+--------------------------------------------------------------------------------------------+
|                      |                                                                     |
| [ ] Dashboard        |  [ INFORMASI ALAT ]                                                 |
| [x] Barang Reuse     |  Nama: BALLON Simpas | Ukuran: 2.0x12 | Kategori: Ballon            |
| [ ] Pemakaian       |  Stok Steril: 5      | Stok Kotor: 2  | Total Reuse: 12x            |
| [ ] Laporan Bulanan  |                                                                     |
|                      |  [ DATA BARANG REUSE ]                                               |
| -------------------- |  +---------------------------------------------------------------+  |
| [ ] Logout           |  | NO | TANGGAL    | NAMA BARANG       | STATUS    | AKSI        |  |
|                      |  |----|------------|-------------------|-----------|-------------|  |
|                      |  | 1  | 13/04/2026 | BALLON Simpas     | STERIL    | [✎] [🗑]     |  |  ← [✎] Buka Modal Edit
|                      |  | 2  | 13/04/2026 | Kateter Hisser    | KOTOR     | [✎] [🗑]     |  |  ← [🗑] Hapus Baris
|                      |  | 3  | 12/04/2026 | Optitorque JL 3.5 | PROSES    | [✎] [🗑]     |  |
|                      |  +---------------------------------------------------------------+  |
|                      |                                                                     |
|                      |  [ MODAL FORM EDIT BARANG REUSE ]                                   |
|                      |  +---------------------------------------------------------------+  |
|                      |  | Nama Barang: [ BALLON Simpas                    ]             |  |
|                      |  | Tanggal:     [ 13/04/2026                       ]             |  |
|                      |  | Status:      (o) STERIL  ( ) KOTOR  ( ) PROSES                |  |
|                      |  |                                                                 |  |
|                      |  | [ SIMPAN PERUBAHAN ]             [ BATAL ]                      |  |
|                      |  +---------------------------------------------------------------+  |
|                      |                                                                     |
|                      |  [ + INPUT BARANG REUSE ]   ← Terkoneksi ke [ DATA BARANG REUSE ]   |
|                      |                                                                     |
+--------------------------------------------------------------------------------------------+
```

### 3.3 Wireframe UI: Pemakaian (Real-time dari Cathlab)

```text
+--------------------------------------------------------------------------------------------+
| [≡] [ PEMAKAIAN ]    | [ MONITORING PEMAKAIAN ALKES REAL-TIME ]                            |
+--------------------------------------------------------------------------------------------+
|                      |                                                                     |
| [ ] Dashboard        |  [ FILTER & SEARCH ]                                                |
| [ ] Barang Reuse     |  Pasien: [ Cari Nama Pasien... ]  Tanggal: [ 13/04/2026 ] [ Cari ]    |
| [x] Pemakaian        |                                                                     |
| [ ] Laporan Bulanan  |  [ DAFTAR PEMAKAIAN TERBARU ]                                       |
|                      |  +---------------------------------------------------------------+  |
| -------------------- |  | WAKTU | PASIEN           | NAMA ALAT                | TIPE | STS |  |
| [ ] Logout           |  |-------|------------------|--------------------------|------|-----|  |
|                      |  | 10:45 | Tn. Dicky Tamara | BALLON Simpas 2.0x12     |  R   | OK  |  |
|                      |  | 10:30 | Tn. Dicky Tamara | Kateter Josephson        |  R   | OK  |  |
|                      |  | 10:15 | Ny. Siti Aminah  | Optitorque JL 3.5        |  N   | OK  |  |
|                      |  | 09:45 | Tn. Ahmad Subarjo| BALLON Genoss 2.5x20     |  R   | GGL |  |
|                      |  +---------------------------------------------------------------+  |
|                      |                                                                     |
|                      |  [ DETAIL PEMAKAIAN: Tn. Dicky Tamara ]                             |
|                      |  +---------------------------------------------------------------+  |
|                      |  | Detail Alkes: BALLON Simpas 2.0x12                            |  |
|                      |  | No. Lot:      LOT-9921                                        |  |
|                      |  | Tipe:         REUSE (R)                                       |  |
|                      |  | Status:       TERPAKAI (Menunggu dikembalikan ke CSSD)         |  |
|                      |  |                                                                 |  |
|                      |  | [ KONFIRMASI TERIMA ALAT KOTOR ]   [ LIHAT REKAM MEDIS ]        |  |
|                      |  +---------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------+
```

### 3.4 Wireframe UI: Laporan Bulanan (Rekapitulasi)

```text
+--------------------------------------------------------------------------------------------+
| [≡] [ LAPORAN BULANAN ] | [ REKAPITULASI PENGGUNAAN ALAT REUSE ]                           |
+--------------------------------------------------------------------------------------------+
|                      |                                                                     |
| [ ] Dashboard        |  [ FILTER LAPORAN ]                                                 |
| [ ] Barang Reuse     |  Bulan: [ April 2026 v ]  Kategori: [ Semua v ]  [ TAMPILKAN ]      |
| [ ] Pemakaian        |                                                                     |
| [x] Laporan Bulanan  |  [ TOOLBAR ]                                                        |
|                      |  [ 🖨️ PRINT ]  [ 📥 EXPORT EXCEL ]  [ 📱 KIRIM WA ]  [ Search... ] |
| -------------------- |                                                                     |
| [ ] Logout           |  [ TABEL REKAPITULASI BULANAN ]                                     |
|                      |  +---------------------------------------------------------------+  |
|                      |  | NO | NAMA BARANG       | UKURAN | STOK AWAL | MASUK | PAKAI | GGL |  |
|                      |  |----|-------------------|--------|-----------|-------|-------|-----|  |
|                      |  | 1  | BALLON Simpas     | 2.0x12 |    1      |   1   |   1   |  0  |  |
|                      |  | 2  | Kateter Hisser    | -      |    5      |   0   |   2   |  1  |  |
|                      |  | 3  | Optitorque JL 3.5 | 5F     |    10     |   5   |   8   |  0  |  |
|                      |  +---------------------------------------------------------------+  |
|                      |                                                                     |
|                      |  [ PREVIEW PESAN WHATSAPP ]                                         |
|                      |  +---------------------------------------------------------------+  |
|                      |  | Halo Dokter/Manajemen, Berikut Laporan Reuse April 2026:      |  |
|                      |  | - Total Pemakaian: 145 Alat                                   |  |
|                      |  | - Tingkat Kegagalan: 3.4% (5 Alat)                            |  |
|                      |  | - Stok Kritis: Kateter Hisser (Sisa 2)                         |  |
|                      |  |                                                                 |  |
|                      |  | [ KIRIM KE GRUP CATHLAB ]      [ BATAL ]                        |  |
|                      |  +---------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------+
```

### 3.5 Detail Komponen Wireframe (Role-Based)
*   **Akses CSSD:** Sidebar hanya menampilkan menu yang relevan dengan siklus sterilisasi dan reuse (Barang Reuse, Log Tindakan, Laporan). Menu **Master Alkes** dan **Stok Depo** disembunyikan untuk menjaga fokus operasional.

#### A. Tampilan Barang Reuse (Inventory)
*   **Grid View / Table View:** Menampilkan daftar alat yang bisa di-reuse.
*   **Status Badge:** Menunjukkan apakah alat sudah siap (Steril) atau sedang dalam proses.
*   **History Tracking:** Setiap alat memiliki log perjalanan dari mulai diterima, dipakai pasien, hingga disterilisasi kembali.

#### B. Modal: Terima Alat Baru (Input Stok)
*   **Field:** `Pilih Barang (Autocomplete)`, `Batch/LOT`, `Expired Date (MM-YYYY)`, `Jumlah Masuk`, `Distributor`.
*   **Logic:** Menambah kolom **"Masuk"** dan mengupdate **"Stok Akhir"**.

#### C. Modal: Catat Gagal Pakai
*   **Field:** `Pilih Alat (dari Log)`, `Nama Pasien (Auto-fill)`, `Penyebab (Dropdown: Balon Pecah, Mampet, Tekuk, ED)`, `Keterangan Tambahan`.
*   **Logic:** Menambah kolom **"Gagal"**, mengurangi **"Stok Akhir"**, dan mencatat histori kualitas alat.

#### D. Indikator Status (Color Coding)
*   **AMAN (Hijau):** Stok > 20% dari Usulan MAR 2026.
*   **KRITIS (Kuning):** Stok < 20% dari Usulan MAR 2026.
*   **RE-ORDER (Merah):** Stok < 5% atau mendekati 0.
*   **EXPIRED (Hitam):** Tanggal ED < Hari ini.

## 4. Rencana Tindak Lanjut
*   Memastikan Master Barang di Depo diperbarui sesuai list Usulan MAR 2026.
*   Implementasi Dashboard CSSD yang terhubung dengan database pemakaian alkes.
*   Sinkronisasi status "Discontinued" agar barang yang tidak dipakai lagi tidak muncul di pilihan perawat.

## 5. Migrasi Database (SQL)

Berikut adalah struktur tabel yang dibutuhkan untuk mendukung modul CSSD dan integrasi data Barang Reuse:

```sql
-- ============================================================
-- MIGRASI: MODUL CSSD & MANAJEMEN BARANG REUSE
-- ============================================================

-- 1. Tabel Master Barang (Jika belum ada kolom kategori/jenis)
CREATE TABLE IF NOT EXISTS public.master_barang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT UNIQUE,
    nama TEXT NOT NULL,
    jenis TEXT DEFAULT 'ALKES',
    kategori TEXT,
    satuan TEXT DEFAULT 'PCS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Master Distributor
CREATE TABLE IF NOT EXISTS public.master_distributor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pt TEXT NOT NULL,
    kontak TEXT,
    is_konsolidasi BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Distributor Barang (Varian Alat berdasarkan Lot/Ukuran)
CREATE TABLE IF NOT EXISTS public.distributor_barang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_barang_id UUID REFERENCES public.master_barang(id) ON DELETE CASCADE,
    distributor_id UUID REFERENCES public.master_distributor(id) ON DELETE SET NULL,
    lot TEXT,
    ukuran TEXT,
    ed DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel CSSD Barang Reuse (Inventory Tracking CSSD)
CREATE TABLE IF NOT EXISTS public.cssd_barang_reuse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_barang_id UUID REFERENCES public.master_barang(id) ON DELETE CASCADE,
    ukuran TEXT,
    stok_steril INTEGER DEFAULT 0,
    stok_kotor INTEGER DEFAULT 0,
    total_reuse_count INTEGER DEFAULT 0,
    status_terakhir TEXT CHECK (status_terakhir IN ('STERIL', 'KOTOR', 'PROSES')),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Log Gagal Pakai (Tracking Kualitas Sterilisasi)
CREATE TABLE IF NOT EXISTS public.cssd_log_gagal_pakai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    master_barang_id UUID REFERENCES public.master_barang(id),
    pasien_name TEXT,
    penyebab_gagal TEXT,
    keterangan_tambahan TEXT,
    petugas_cssd_id UUID,
    tanggal_kejadian TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Update Tabel Pemakaian Order
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cathlab_pemakaian_order' AND column_name='status_alkes_cssd') THEN
        ALTER TABLE public.cathlab_pemakaian_order ADD COLUMN status_alkes_cssd TEXT DEFAULT 'PENDING';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cathlab_pemakaian_order' AND column_name='petugas_cssd') THEN
        ALTER TABLE public.cathlab_pemakaian_order ADD COLUMN petugas_cssd TEXT;
    END IF;
END $$;

-- Indexing untuk performa dashboard
CREATE INDEX IF NOT EXISTS idx_cssd_reuse_master ON public.cssd_barang_reuse(master_barang_id);
CREATE INDEX IF NOT EXISTS idx_cssd_gagal_order ON public.cssd_log_gagal_pakai(order_id);
```

---
*Dokumen ini disimpan sebagai referensi pengembangan modul CSSD dan Depo di aplikasi IDIK.*
