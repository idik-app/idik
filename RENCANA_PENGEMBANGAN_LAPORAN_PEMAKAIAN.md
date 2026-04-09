# Rencana Pengembangan: Laporan Pemakaian Alkes (High-Value)

Dokumen ini merangkum spesifikasi teknis dan desain untuk fitur **Laporan Pemakaian Alkes** yang difokuskan pada audit barang bernilai tinggi (Stent, Balloon, dll) di unit Cathlab.

## 1. Tujuan Fitur

- Memudahkan audit stok barang bernilai tinggi secara real-time.
- Membedakan status logistik (Konsolidasi vs Non-Konsolidasi).
- Menyediakan catatan operasional yang tersimpan otomatis (_autosave_).
- Mempercepat pelaporan ke pihak distributor melalui integrasi WhatsApp.

## 2. Struktur Tabel Utama (Wireframe)

| TANGGAL   | PASIEN / NO. RM                      | DOKTER          | DETAIL PEMAKAIAN (ALKES)                                                                                                                  | KETERANGAN (AUTOSAVE)                                                  |
| :-------- | :----------------------------------- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **08/04** | **Tn. Budi Santoso** <br> `12-34-56` | dr. Ahmad Sp.JP | **[STENT]** Onyx Frontier 3.5x18 <font color="#10b981">**[Konsolidasi]**</font> <br> <font color="#666">LOT: 240101 \| ED: 12/2027</font> | `[ Input: Catatan... ]` <br> <font color="emerald">✓ Tersimpan</font>  |
| **08/04** | **Ny. Siti Aminah** <br> `99-88-77`  | dr. Siska Sp.An | **[BALLOON]** Euphora 2.5x15 <font color="#f59e0b">**[Non Konsolidasi]**</font> <br> <font color="#666">LOT: 9988 \| Size: 2.5mm</font>   | `[ Input: Catatan... ]` <br> <font color="amber">● Menyimpan...</font> |

## 3. Spesifikasi Teknis & UI

### A. Detail Pemakaian (Alkes)

- **Kategori:** Diambil dari `DISTRIBUTOR_PRODUK_KATEGORI` (STENT, BALLOON, CATHETER, dll).
- **Metadata:** Menampilkan Nama Barang, LOT, ED, dan Ukuran.
- **Status Konsolidasi:**
  - **Konsolidasi:** Teks Hijau (`text-emerald-400`), untuk stok titipan vendor.
  - **Non Konsolidasi:** Teks Oranye (`text-amber-400`), untuk stok internal RS.

### B. Keterangan (Autosave Silent)

- **Fitur:** Input teks tanpa tombol simpan.
- **UX:** Indikator status "Menyimpan..." (Amber) dan "Tersimpan" (Emerald) yang minimalis.
- **Logic:** Menggunakan _debounce_ 1 detik untuk efisiensi pengiriman data ke API.

### C. Filter & Navigasi

- Dropdown filter berdasarkan **Kategori Alkes**.
- Filter berdasarkan **Status Konsolidasi**.
- Date picker untuk rentang periode laporan.

## 4. Standar Visual (Dark Mode IDIK)

- **High Contrast:** Nama Pasien & Dokter (`dark:text-white`).
- **Muted Text:** Metadata LOT/ED/RM (`dark:text-white/45`).
- **Badge Colors:** Cyan untuk Stent, Amber untuk Balloon, Emerald untuk Konsolidasi.

## 5. Integrasi WhatsApp (Audit Ready)

Format pesan yang dihasilkan:

> `*LAPORAN PEMAKAIAN ALKES:*`
> `08/04 - Tn. Budi: [STENT] Onyx 3.5x18 (Konsolidasi) [LOT: 240101]. Ket: (Catatan)`
