# Wireframe: Tambah barang di tab **Komponen cathlab**

Dokumen ini merangkum diskusi UX (tanpa implementasi kode) untuk menambah barang pada alur **Rincian barang** → tab **Komponen cathlab** (`RincianBarangTemplateTabs.tsx`), dengan:

- **Kategori alkes** selaras enum di `lib/distributorCatalog.ts` (`DISTRIBUTOR_PRODUK_KATEGORI`).
- **Distributor** dengan pola pemilihan seperti di `app/dashboard/admin/components/UserCrud.tsx` (dropdown PT + opsi edit nama).

---

## 1. Konteks: `distributorCatalog` baris 2–8

Cuplikan tersebut mendefinisikan **kategori** level mapping distributor, **bukan** daftar nama produk (SKU):

| Nilai enum |
|------------|
| STENT |
| BALLON |
| WIRE |
| GUIDING |
| KATETER |

**Implikasi UX**

| Konsep | Sumber yang masuk akal |
|--------|-------------------------|
| **Kategori alkes** | Dropdown / pill dari enum di atas (sama dengan normalisasi di katalog). |
| **Nama barang** | Teks bebas **atau** pencarian / pilih dari **master barang / katalog distributor** (mis. variants API), agar selaras dengan layar **Barang (Cathlab)** (nama, kode, LOT, stok, dll.). |

Jika kebutuhan hanya “label seperti di katalog distributor”, itu pada praktiknya **kategori**; **nama SKU** perlu sumber data tambahan (bukan hanya array lima string).

---

## 2. Pola distributor (sejalan UserCrud)

- **Select** dengan placeholder: *Pilih distributor* / *Memuat distributor…*
- Daftar opsi: `nama_pt` (atau fallback id).
- Opsional: tombol **Edit PT** ketika satu distributor terpilih (sama perilaku admin, jika relevan di konteks pemakaian).

**Tujuan**: setiap baris komponen terikat ke PT yang benar (audit, stok, konsistensi dengan inventaris Cathlab).

---

## 3. Penempatan di tab **Komponen cathlab**

Perilaku tab saat ini: konten = **tabel template** (No, Item, Jumlah/isian, Ket.) dari checklist.

**Opsi integrasi (pilih satu arah produk)**

| Opsi | Deskripsi |
|------|-----------|
| **A. Panel di atas/bawah tabel template** | Blok “Tambah komponen” **tidak** mengubah definisi template; hanya menambah entri untuk sesi/form ini. Tabel template tetap seperti sekarang. |
| **B. Perluasan baris template** | Setiap baris checklist bisa membawa metadata distributor + kategori; lebih kompleks secara model data dan UI. |

Wireframe di bawah mengasumsikan **Opsi A**: satu **panel form** + satu **tabel ringkasan** baris yang ditambahkan, di sekitar tabel template yang ada.

---

## 4. Wireframe (layout desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Struk (master)]  [Obat / Alkes]  [Komponen cathlab]  ← tab aktif          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Tambah komponen cathlab                                                     │
│                                                                              │
│  Distributor                                                                 │
│  ┌────────────────────────────────────────────┐  ┌────────────┐              │
│  │ Pilih distributor ▼                         │  │  Edit PT   │  (opsional) │
│  └────────────────────────────────────────────┘  └────────────┘              │
│                                                                              │
│  Kategori alkes                                                              │
│  ┌────────────────────────────────────────────┐                              │
│  │ STENT ▼   (STENT | BALLON | WIRE | …)      │                              │
│  └────────────────────────────────────────────┘                              │
│                                                                              │
│  Nama barang                                                                 │
│  ┌────────────────────────────────────────────┐                              │
│  │ Cari atau ketik nama produk…               │  ← autocomplete / master     │
│  └────────────────────────────────────────────┘                              │
│  Bantuan: selaraskan dengan master Cathlab (kode, LOT, ukuran di langkah      │
│           berikutnya jika dipisah).                                          │
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │ + Tambah ke daftar │                                                      │
│  └──────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Checklist template (existing TemplateTable)                                 │
│  ┌────┬──────────────┬─────────────────┬──────┐                              │
│  │ No │ Item         │ Jumlah / isian  │ Ket. │                              │
│  ├────┼──────────────┼─────────────────┼──────┤                              │
│  │ …  │ …            │ …               │ …    │                              │
│  └────┴──────────────┴─────────────────┴──────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Daftar komponen ditambahkan (baru)                                          │
│  ┌─────────────────┬──────────┬────────────────────┬─────────┬──────────┐  │
│  │ Distributor     │ Kategori │ Nama barang        │ Jumlah  │ Aksi     │  │
│  ├─────────────────┼──────────┼────────────────────┼─────────┼──────────┤  │
│  │ PT. …           │ STENT    │ …                  │  [ 1 ]  │ Hapus    │  │
│  └─────────────────┴──────────┴────────────────────┴─────────┴──────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Wireframe (layout sempit / mobile)

Urutan vertikal penuh lebar:

1. Distributor (select full width)  
2. Kategori (select)  
3. Nama barang (input / combobox)  
4. Tombol **Tambah ke daftar**  
5. Tabel checklist (scroll horizontal jika perlu)  
6. Tabel daftar komponen (scroll horizontal jika perlu)

---

## 6. Alur pengguna

1. Buka tab **Komponen cathlab**.  
2. Pilih **distributor**.  
3. Pilih **kategori** dari enum katalog.  
4. Isi atau pilih **nama barang** (ideal dari master).  
5. Klik **Tambah ke daftar** → baris muncul di tabel ringkasan; isi **jumlah**; **Hapus** bila salah.  
6. (Opsional) Isi juga **checklist template** jika dua jenis input tetap dipakai bersamaan.

---

## 7. Keputusan produk yang perlu diputuskan

| Pertanyaan | Dampak |
|------------|--------|
| Nama barang **wajib** dari master vs boleh **free text**? | Validasi, duplikasi, konsistensi stok. |
| Baris tambahan **terpisah** dari template vs **menjadi** baris template? | Struktur state & penyimpanan. |
| **Satu** distributor untuk seluruh form vs **per baris** beda PT? | UX dropdown (satu vs per baris). |

Setelah tiga hal ini diputuskan, wireframe bisa disederhanakan (mis. hilangkan kolom distributor di tabel jika global satu PT).

---

## 8. Referensi file (konteks kode)

| File | Peran |
|------|--------|
| `lib/distributorCatalog.ts` | Enum kategori `DISTRIBUTOR_PRODUK_KATEGORI` + util normalisasi / infer nama. |
| `app/dashboard/admin/components/UserCrud.tsx` | Pola UI pemilihan distributor (+ Edit PT). |
| `app/dashboard/pemakaian/components/RincianBarangTemplateTabs.tsx` | Tab **Komponen cathlab** + `TemplateTable`. |

---

*Dokumen ini untuk perencanaan UI; implementasi disesuaikan dengan keputusan produk di bagian 7.*
