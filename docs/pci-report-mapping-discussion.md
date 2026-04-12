# Diskusi Pemetaan Data Laporan PCI/CAG ke Wireframe

**Tanggal**: 12 April 2026  
**File Terkait**: `app/dashboard/layanan/tindakan/bridge/wireframeDrawerTabs.ts`

## Konteks
Diskusi mengenai bagaimana memetakan data dari gambar laporan prosedur PCI/CAG (Cathlab) ke dalam struktur field di tab **"Klinis dan Laporan"**.

## Pemetaan Data yang Disarankan

Berdasarkan gambar laporan yang diunggah, berikut adalah usulan pemetaan field:

| Data Laporan | Field di `wireframeDrawerTabs.ts` | Status |
| :--- | :--- | :--- |
| **Clinical Diagnosis** | `diagnosa` | Selesai (Auto-logic: STEMI/NSTEMI/UAP -> Severity) |
| **Risk Factor** | `faktor_risiko` | Selesai (di Klinis) |
| **Conclusion** | `kesimpulan_laporan` | Selesai (di Tindakan) |
| **Plan** | `plan_medis` | Selesai (di Tindakan) |
| **Temuan Pembuluh** | `temuan_pembuluh` | Selesai (di Tindakan - detail LM, LAD, dll) |
| **Fluoro time** | `fluoro_time` | Selesai (di Rad) |
| **Air kerma** | `air_kerma` | Selesai (di Rad) |
| **DAP** | `dap_dose` | Selesai (di Rad) |
| **Contrast Total** | `total_kontras` | Selesai (di Klinis) |

## Otomasi Data
- **Diagnosa -> Severity**: Sistem secara otomatis menentukan `severity_level` berdasarkan kata kunci di `diagnosa`:
  - **STEMI** / **TAVB** -> `1` (Level 1 - High Emergency)
  - **NSTEMI** / **SVT** / **AVM** -> `2` (Level 2 - Moderate)
  - **UAP** / **CVI** / **VARISES** -> `3` (Level 3 - Low Risk)
- **Kesimpulan -> Kategori & Detail**: Sistem secara otomatis menentukan `kategori` dan mengekstrak detail perangkat ke `hasil_lab_ppm` berdasarkan kata kunci di `kesimpulan_laporan`:
  - **MILD CAD** -> `MILD CAD`
  - **TRIPLE VESSEL** / **TVD** / **3VD** -> `PCI`
  - **PACEMAKER** / **PPM** -> Kategori `PPM` + Ekstrak nama perangkat (setelah kata "implantation") ke `hasil_lab_ppm`.
  - **EP STUDY** / **ABLATION** -> Kategori `EP`
  - **EVLA** -> Kategori `EVLA`
  - **DSA** / **EMBOLIZATION** / **AVM** -> Kategori `EVT`
  - **NORMAL** -> `Diagnostic`
- **Ekstraksi Nama Pasien**: Mengekstrak nama dari format "NAMA, SAPAAN" (misal: TRI UNTORO, TN) menjadi "TRI UNTORO (TN)".
- **Tindakan -> Kategori**: Sistem secara otomatis menentukan `kategori` saat memilih prosedur di tabel utama:
  - **EP STUDY** / **ABLATION** -> `EP`
  - **PTCA** / **PCI** / **STENT** -> `PCI`
  - **PACEMAKER** / **PPM** / **TPM** -> `PPM`
  - **DCA** / **CAG** / **CORONARY ANGIOGRAPHY** -> `Diagnostic`
- **Ekstraksi Tim Medis**: Sistem secara otomatis mengekstrak tim medis dari teks laporan:
  - **Operator** / **Attending Physician** -> `dokter`
  - **Scrub nurse** / **Asisten** -> `asisten`
  - **Circulating nurse** / **Sirkuler** -> `sirkuler`
  - **Technician** / **Logger** -> `logger`
- **REGISTER -> No. RM**: Mengekstrak nomor registrasi dari teks "REGISTER : 123456" atau "RM : 123456".
- **Tanggal Otomatis**: Mengekstrak tanggal tindakan dari teks laporan (misal: "07 APRIL 2026") dan memperbarui field `tanggal_tindakan`.
- **Ekstraksi Data Teknis**: Secara otomatis mengambil data dari teks laporan:
  - **Contrast Total** (ml) -> `total_kontras`
  - **Fluoro time** (menit & detik) -> `fluoro_time` (otomatis dikonversi ke detik)
  - **Air kerma** (mGy) -> `air_kerma`
  - **DAP** (mGycm) -> `dap_dose`
- **Auto-sync**: Data ini disinkronkan ke tabel `tindakan` dan master `pasien` secara otomatis saat pengetikan selesai (autosave).
- **History Connection**: Tab **History (Resume)** kini menampilkan ringkasan klinis (Diagnosa, Kesimpulan, Plan) dari sesi saat ini dan menyertakan kesimpulan di daftar riwayat tindakan pasien sebelumnya.
- **WhatsApp Resume**: Generator teks WhatsApp secara otomatis menyertakan semua field baru untuk memudahkan pelaporan.

## Implementasi Field

Field telah diimplementasikan di `app/dashboard/layanan/tindakan/bridge/wireframeDrawerTabs.ts`:

### Tab Tindakan (id: "tindakan")
```typescript
fields: ["tanggal_tindakan", "tindakan", "kategori", "temuan_pembuluh", "kesimpulan_laporan", "plan_medis"]
```

### Tab Radiologi (id: "radiologi")
```typescript
fields: ["fluoro_time", "air_kerma", "dap_dose", "kv", "ma", "waktu"]
```

### Tab Klinis dan Laporan (id: "klinis")
```typescript
fields: [
  "pci_report_link",
  "diagnosa",
  "faktor_risiko",
  "severity_level",
  "total_kontras",
  "hasil_lab_ppm",
]
```

## Catatan Tambahan
- Data anatomi koroner (LM, LAD, LCx, RCA) mungkin terlalu detail untuk field individual, namun bisa ditampung dalam field `catatan_prosedur` atau `temuan_anatomis`.
- `pci_report_link` bertindak sebagai pintu masuk untuk melihat laporan lengkap ini.
