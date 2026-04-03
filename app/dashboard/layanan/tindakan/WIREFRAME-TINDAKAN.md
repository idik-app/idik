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

*Terakhir diselaraskan dengan implementasi di `TableToolbar`, `FastTrackListModal`, `TindakanHariIniModal`, `TindakanTerbanyakLabModal`, `ReportExportActionBar`.*
