# Wireframe — modul Tindakan (Cathlab)

Dokumen ASCII untuk layar yang **sudah diimplementasi** di toolbar / modal. Update sejalan dengan perubahan UI.

---

## 1. Toolbar tabel tindakan (atas)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [ikon sinkron…]  [ + Tambah Pasien ]  [ ⚡ Fast-Track ]  [ 📊 Lab Kateter ]       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  🔍 [ Cari (RM, nama, dokter, …)________________________________ ]                 │
│  [ Semua dokter ▼ ]  [ Semua ruangan ▼ ]   [tanggal-dari] — [tanggal-sampai]       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Bar ekspor laporan (komponen bersama)

Dipakai di beberapa modal (Fast-Track, Tindakan hari ini, Lab Kateter).

```
  ┌─────────┐  ┌─────────┐  ┌─────────────┐
  │  Cetak  │  │  Unduh  │  │  Kirim WA   │
  └─────────┘  └─────────┘  └─────────────┘
       ↑            ↑              ↑
   netral      netral         hijau (WhatsApp)
```

Tombol nonaktif saat **memuat data** atau **tidak ada baris / tidak ada kolom tahun** (tergantung jenis laporan).

---

## 3. Modal Fast-Track (IGD → cathlab)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Fast-Track (IGD → cathlab)              [ Cetak ] [ Unduh ] [ Kirim WA ]          │
│  Filter … IGD, door-to-balloon, foto dokumentasi.                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Filter (panel amber) ─────────────────────────────────────────────────────┐   │
│ │ [Bulan yyyy-mm ▼] [Dokter ▼] [Tindakan ▼]                                     │   │
│ │ IGD: [datetime-dari] [datetime-sampai]   D2B: [datetime-dari] [datetime-sampai]│   │
│ │                                                      [ Reset filter ]         │   │
│ └───────────────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Tabel (scroll horizontal) ──────────────────────────────────────────────────┐ │
│ │ No │ Foto │ Tgl │ RM │ Nama │ JK │ Lahir │ Umur │ Alamat │ Telp │ Dokter │ …  │ │
│ │────│──────│─────│────│──────│────│───────│──────│────────│──────│────────│────│ │
│ │ 1  │[img] │ …   │ …  │ …    │ …  │ …     │ …    │ …      │ …    │ …      │ …  │ │
│ │ …  │      │     │    │      │    │       │      │        │      │        │    │ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
│  Menampilkan N baris · bulan YYYY-MM                                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Modal Tindakan hari ini

*(Dibuka dari dashboard/header, bukan dari toolbar tabel — lihat `TindakanDashboard`.)*

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Tindakan hari ini                       [ Cetak ] [ Unduh ] [ Kirim WA ]          │
│  [tanggal panjang, contoh: 2 April 2026]                                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [ Memuat… / Tidak ada tindakan… / tabel ]                                        │
│ ┌─ Tabel ──────────────────────────────────────────────────────────────────────┐ │
│ │ No │ Tanggal │ Time out │ RM │ Nama │ JK │ Dokter │ Tindakan │ Ruangan        │ │
│ │────│─────────│──────────│────│──────│────│────────│──────────│────────        │ │
│ │ 1  │ …       │ …        │ …  │ …    │ …  │ …      │ …        │ …              │ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Modal Lab Kateter (tindakan terbanyak × tahun)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  📊 Tindakan terbanyak di Laboratorium Kateterisasi   [Cetak][Unduh][Kirim WA]   │
│  Frekuensi per jenis × tahun …                                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Filter (panel violet) ──────────────────────────────────────────────────────┐  │
│ │ [Tahun dari] [Tahun sampai]  [Bulan opsional ▼]  [Dokter ▼]                    │  │
│ └──────────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Header tabel 2 baris ───────────────────────────────────────────────────────┐  │
│ │              │                    TAHUN                                        │  │
│ │ TINDAKAN     │  2020 │ 2021 │ 2022 │ 2023 │ 2024 │ 2025 │ …                    │  │
│ ├──────────────┼───────┴──────┴──────┴──────┴──────┴──────┴                      │  │
│ │ Primary PCI  │  —  │  …  │  …  │  …  │  …  │ 222 │                              │  │
│ │ Elektif PCI  │  …  │  …  │  …  │  …  │  …  │  …  │                              │  │
│ │     …        │  …  │  …  │  …  │  …  │  …  │  …  │                              │  │
│ │ Lainnya *    │  …  │  …  │  …  │  …  │  …  │  …  │   (* hanya jika ada data)    │  │
│ │ JUMLAH       │  Σ  │  Σ  │  Σ  │  Σ  │  Σ  │  Σ  │                              │  │
│ └──────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Alur ringkas (yang sudah ada)

```
Toolbar tabel
    │
    ├─► [Fast-Track]     → modal daftar pasien + waktu IGD/D2B + foto + ekspor
    │
    └─► [Lab Kateter]    → modal matriks frekuensi × tahun + ekspor

Dashboard (header)
    │
    └─► [Tindakan hari ini] → modal daftar hari ini + ekspor
```

---

## 7. Rencana (belum di UI — lihat LAPORAN-DISKUSI.md)

```
Toolbar
    │
    └─► [Laporan]  → satu modal, tab: Jenis operasi (matriks bulan) | Cara bayar (matriks bulan)
                     + Cetak / Unduh / WA (pola sama)
```

---

## 8. Modal Laporan Pasien (Dashboard & Detail Tindakan)

*(Dibuka dari dropdown "LAPORAN" di toolbar tabel — Laporan Pasien)*

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  📋 Laporan Pasien Cathlab                [ Cetak ] [ Unduh Excel ] [ Kirim WA ]  │
│  Tabulasi pasien, filter tanggal awal-akhir, ringkasan dashboard & detail drawer │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Dashboard KPI Ringkasan (Panel Navy/Indigo) ────────────────────────────────┐ │
│ │  Total Pasien   │ Total Tindakan  │ Distribusi Pembiayaan │ Distribusi Status │ │
│ │   [  240  ]     │    [  285  ]    │ BPJS: 190 (79%)       │ Selesai: 220      │ │
│ │                 │                 │ Mandiri: 30 (12%)     │ Terjadwal: 15     │ │
│ │                 │                 │ Jaminan: 20 (9%)      │ Draft: 5          │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Filter Pencarian (Mendukung Checklist Pilihan Ganda) ───────────────────────┐ │
│ │ Tanggal: [tanggal-dari] s/d [tanggal-sampai]  Pencarian: [ Cari RM, Nama... ] │ │
│ │ Dokter: [ 2 terpilih ▼ ]  Pembiayaan: [ Semua ▼ ]  Status: [ Selesai ▼ ]     │ │
│ │   ┌───────────────────────┐                                                  │ │
│ │   │ 🔍 Cari dokter...     │                                                  │ │
│ │   │ 🗹 Dr. Budi            │                                                  │ │
│ │   │ 🗹 Dr. Andi            │                                                  │ │
│ │   │ ▢ Dr. Citra           │                                                  │ │
│ │   └───────────────────────┘                                                  │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Tabel Pasien (Klik baris membuka detail drawer) ────────────────────────────┐ │
│ │ No │ Tanggal & Waktu │ No RM  │ Nama Pasien    │ Dokter Operator │ Tindakan  │...│ │
│ │────│─────────────────│────────│────────────────│─────────────────│───────────│───│ │
│ │ 1  │ 28-07-2026 09:00│ 123456 │ Tn. Ahmad      │ Dr. Budi        │ EVLA Kiri │...│ │
│ │ 2  │ 28-07-2026 10:30│ 789012 │ Ny. Siti       │ Dr. Andi        │ EVLA      │...│ │
│ │ …  │                 │        │                │                 │           │   │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│  Halaman: [ < ] 1 [ 2 ] 3 [ > ]     Tampilkan: [ 1000 ▼ ] baris (pilihan s/d 1000) │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

*Terakhir diselaraskan dengan implementasi di `TableToolbar`, `FastTrackListModal`, `TindakanHariIniModal`, `TindakanTerbanyakLabModal`, `TindakanLaporanPasienModal`, `ReportExportActionBar`.*
