# Audit Modul Pasien — Efisiensi

**Tanggal:** 13 Maret 2025  
**Lingkup:** `app/dashboard/pasien/`

---

## 1. Alur yang dipakai (entry)

- **Route:** `app/dashboard/pasien/page.tsx` → `PasienProvider` → `PasienContent`
- **PasienContent** pakai: `PasienToolbar`, `PasienTable` (dari `./components/PasienTable`), `PasienModalForm`, `PatientDetailModal`
- **PasienToolbar** = wrapper tipis → `ToolbarMain` (search, pagination, stats, import/export, FormTambahPasien saat modal add)

---

## 2. Duplikasi & file tidak terpakai

| Item | Masalah | Rekomendasi |
|------|--------|-------------|
| **index.tsx** | Halaman alternatif pakai `usePasienCrud` + props; route Next.js pakai **page.tsx** saja. Tidak di-import dari mana pun. | **Hapus** `index.tsx` (dead code). |
| **PasienContext.backup.tsx** | Backup lama context. | **Hapus** atau pindah ke `_backup/` di luar tree yang di-bundle. |
| **modals/FormTambahPasien.tsx** | Hampir sama dengan **components/FormTambahPasien.tsx**. ToolbarMain pakai `../FormTambahPasien` = components. | **Hapus** `modals/FormTambahPasien.tsx` (duplikat). |
| **Dua implementasi tabel** | `components/PasienTable.tsx` (flat, ~230 baris) vs `components/PasienTable/` (modular: Header, Body, Skeleton). Import `./components/PasienTable` resolve ke **file** PasienTable.tsx, jadi folder **PasienTable/** tidak dipakai di alur utama. | Pilih satu: (A) Hapus folder `PasienTable/` dan pertahankan flat `PasienTable.tsx`, atau (B) Jadikan folder sebagai sumber utama (index export) dan hapus flat file lalu update import di PasienContent. |
| **Dua usePasienCrud** | `hooks/usePasienCrud.ts` (pakai usePasienCrudBase + state sendiri) vs `contexts/usePasienCrud.ts` (pakai PasienContext + server actions). Komponen pakai **hooks/usePasienCrud**. | Pertahankan **hooks/usePasienCrud**; evaluasi apakah contexts/usePasienCrud masih dipakai (core/index export). Bisa digabung atau deprecate yang di context. |
| **usePasienLoader** | “Disabled mode”, tidak dipakai kecuali di backup. | Bisa **hapus** atau biarkan jika ingin fitur “loader” nanti. |
| **usePasienRealtime** (3 tempat) | `hooks/usePasienRealtime.ts` (dummy), `contexts/usePasienRealtime.ts`, `contexts/core/PasienRealtime.ts`. Realtime aktif di **PasienProvider** (Supabase channel), bukan di hook terpisah. | Satu sumber realtime di Provider; hook/handler lain bisa deprecate atau dijadikan alias. |

---

## 3. Impor & path

- Sebagian pakai path relatif (`../contexts`, `../../hooks`), sebagian `@/app/dashboard/pasien/...`. Seragamkan ke **satu gaya** (mis. `@/app/dashboard/pasien/...` untuk file di luar folder, relatif di dalam modul) agar refactor lebih aman.
- **PasienHooks** di-import dari `PasienContext` (barrel) dan dari `PasienHooks`; pastikan barrel **contexts/index.ts** / **PasienContext.tsx** export satu pintu agar tidak bingung.

---

## 4. Data flow

- **State utama:** PasienProvider (reducer: patients, filteredPatients, loading, modal, dll.).
- **CRUD:** Server actions (addPatient, editPatient, deletePatient) + clientBridge (API) + audit.
- **Tabel:** PasienTable.tsx baca `usePasien()` (context) dan `usePasienCrud()` (hooks) untuk handleDelete. usePasienCrud (hooks) sendiri pakai usePasienCrudBase yang punya state patients terpisah — **dua sumber kebenaran**. Untuk efisiensi dan hindari bug: pastikan tabel dan toolbar hanya baca dari **satu sumber** (PasienProvider); CRUD hanya update lewat context atau satu base.

---

## 5. Checklist efisiensi (ringkas)

- [x] Hapus **index.tsx**
- [x] Hapus atau pindah **PasienContext.backup.tsx**
- [x] Hapus **modals/FormTambahPasien.tsx** (duplikat)
- [x] Pilih satu implementasi tabel: dipakai **flat** `components/PasienTable.tsx`; folder **PasienTable/** dihapus (modular tidak terpakai)
- [x] Satu usePasienCrud: **hooks/usePasienCrud** pakai context (usePasien + refresh); **contexts/usePasienCrud** dan **usePasienCrudBase** dihapus
- [ ] Satu alur realtime (Provider); rapikan hook usePasienRealtime (opsional)
- [ ] Seragamkan import path (relatif vs @ alias) (opsional)
- [x] Satu sumber state pasien (PasienProvider) untuk UI; CRUD refresh context setelah aksi

---

*Audit berdasarkan pemindaian struktur dan referensi import; perilaku runtime tetap perlu dicek setelah refactor.*
