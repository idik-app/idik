# Audit Menu / Modul — IDIK-App

Dokumen ini memeriksa setiap menu atau modul yang tercantum di **menuConfig** dan yang di-render lewat **TabContent**, serta konsistensi route (Next.js `app/`) dengan href di sidebar.

**Referensi:** `app/config/menuConfig.tsx`, `components/TabContent.tsx`, `app/**/page.tsx`, `middleware.ts`.

---

## Ringkasan Eksekutif

| Kategori | Total menu | Route + tab OK | Route salah / 404 | Tab "belum ditemukan" | Placeholder / WIP |
|----------|------------|----------------|-------------------|------------------------|-------------------|
| Main | 3 | 3 | 0 | 0 | 0 |
| Cathlab | 4 | 2 | 2 | 2 | 1 |
| Layanan | 4 | 1 | 3 | 3 | 0 |
| Admin | 3 | 0 | 3 | 3 | 0 |
| Tools | 2 | 0 | 1 | 2 | 1 |
| Settings | 1 | 0 | 1 | 1 | 0 |
| System | 9 | 0 | 9 | 0* | 0 |

\* System: TabContent punya case untuk system/database/console dll, tapi **href di menu mengarah ke `/dashboard/system/*`** sedangkan **route Next.js ada di `/system/*`** → klik menu = 404.

---

## 1. Main

| Menu | id | href | Route ada? | TabContent | Konten | RBAC |
|------|-----|------|------------|------------|--------|------|
| Dashboard | dashboard | /dashboard | ✅ `app/dashboard/page.tsx` | ✅ | DashboardMain + JARVIS | - |
| Pasien | pasien | /dashboard/pasien | ✅ `app/dashboard/pasien/page.tsx` | ✅ | PasienProvider + PasienContent | - |
| Dokter | dokter | /dashboard/dokter | ✅ `app/dashboard/dokter/page.tsx` | ✅ | DokterProvider + DokterContent | - |

**Status:** Semua berfungsi. Tidak ada RBAC khusus; middleware hanya proteksi `/dashboard/*` (session) dan admin-only untuk `/dashboard/admin`, `/dashboard/audit`, `/dashboard/database`.

---

## 2. Cathlab

| Menu | id | href | Route ada? | TabContent | Konten | Catatan |
|------|-----|------|------------|------------|--------|---------|
| Inventaris | inventaris | /dashboard/inventaris | ✅ | ✅ | InventarisContent (dynamic) | OK |
| Pemakaian Alkes | pemakaian | /dashboard/pemakaian | ✅ | ✅ | Statistik + placeholder teks | UI ada, data masih dummy/placeholder |
| Monitoring Cathlab | monitoring | /dashboard/monitoring | ❌ | ❌ | - | Href salah: route sebenarnya **/dashboard/smart/monitoring**. Tab "monitoring" → fallback "Modul belum ditemukan". |
| Grafik | grafik | /dashboard/grafik | ❌ | ❌ | - | Tidak ada `app/dashboard/grafik/page.tsx` dan tidak ada case di TabContent. |

**Rekomendasi Cathlab:**  
- Monitoring: ubah href ke `/dashboard/smart/monitoring` dan tambah case `monitoring` di TabContent (import page smart/monitoring).  
- Grafik: tambah route `app/dashboard/grafik/page.tsx` + case TabContent, atau sembunyikan dari menu sampai siap.

---

## 3. Layanan

| Menu | id | href | Route ada? | TabContent | Konten | Catatan |
|------|-----|------|------------|------------|--------|---------|
| Registrasi Pasien | registrasi | /dashboard/layanan/registrasi | ❌ | ❌ | - | Tidak ada route & tidak ada case tab. |
| Tindakan Medis | tindakan | /dashboard/layanan/tindakan | ✅ | ✅ | TindakanDashboard | OK |
| Hasil Pemeriksaan | hasil | /dashboard/layanan/hasil | ❌ | ❌ | - | Tidak ada route & case tab. |
| Laboratorium | lab | /dashboard/layanan/lab | ❌ | ❌ | - | Tidak ada route & case tab. |

**Rekomendasi Layanan:**  
- Registrasi, Hasil, Lab: tambah route + TabContent case jika modul direncanakan; atau hilangkan dari menu sampai siap.

---

## 4. Admin

| Menu | id | href | Route ada? | TabContent | Konten | Catatan |
|------|-----|------|------------|------------|--------|---------|
| Vendor / Distributor | vendor | /dashboard/vendor | ❌ | ❌ | - | Tidak ada route & case tab. |
| Logistik & Stok | logistik | /dashboard/logistik | ❌ | ❌ | - | Tidak ada route & case tab. |
| Manajemen User | user | /dashboard/user | ❌ | ❌ | - | Tidak ada route & case tab. |

**RBAC:** Middleware tidak membatasi grup Admin ini; hanya `adminRoutes = ["/dashboard/admin", "/dashboard/audit", "/dashboard/database"]`.  
**Rekomendasi:** Tambah route + TabContent untuk vendor/logistik/user jika dipakai, atau sembunyikan dari menu. Jika modul ini hanya untuk admin, pertimbangkan menambah path ke `adminRoutes`.

---

## 5. Tools

| Menu | id | href | Route ada? | TabContent | Konten | Catatan |
|------|-----|------|------------|------------|--------|---------|
| Report Generator | report | /dashboard/tools/report | ❌ | ❌ | - | Tidak ada route & case tab. |
| Analytics | analytics | /dashboard/tools/analytics | ❌ | ❌ | - | Route yang ada: **/dashboard/smart/analytics** (placeholder). Href & tab id tidak sinkron. |

**Rekomendasi:**  
- Analytics: align menu (href `/dashboard/smart/analytics` dan id misalnya `smart-analytics`) atau buat route `/dashboard/tools/analytics` yang redirect/forward ke smart/analytics. Tambah case di TabContent.  
- Report: tambah route + TabContent atau sembunyikan dari menu.

---

## 6. Settings

| Menu | id | href | Route ada? | TabContent | Konten | Catatan |
|------|-----|------|------------|------------|--------|---------|
| Pengaturan | pengaturan | /dashboard/settings/pengaturan | ❌ | ❌ | - | Tidak ada route & case tab. |

**Rekomendasi:** Tambah `app/dashboard/settings/pengaturan/page.tsx` + case TabContent, atau sembunyikan sampai siap.

---

## 7. System (Dev/Admin)

Semua item System di menuConfig memakai **href `/dashboard/system/...`**, sementara **route Next.js ada di bawah `app/system/...`** (prefix **/system**, bukan /dashboard/system). Akibatnya: klik menu → navigasi ke `/dashboard/system/database` dll → **404** (tidak ada `app/dashboard/system/`).

| Menu | id | href (menu) | Route Next.js | TabContent | Catatan |
|------|-----|-------------|---------------|------------|---------|
| Diagnostics | diagnostics | /dashboard/system | /system | ✅ (system) | 404 jika buka lewat URL menu. Tab "system" ada. |
| File Monitor | file-monitor | /dashboard/system/file-monitor | Tidak ada | ❌ | 404 + tidak ada case tab. |
| Database Explorer | database | /dashboard/system/database | /system/database | ✅ | 404 dari menu; tab "database" render DatabasePage. |
| Supabase Console | supabase | /dashboard/system/supabase | /system/supabase | ✅ | 404 dari menu. |
| Console & Logs | console | /dashboard/system/console | /system/console | ✅ | 404 dari menu. |
| API Keys | api-keys | /dashboard/system/api-keys | /system/api-keys | ✅ | 404 dari menu. |
| Debug Tools | debug | /dashboard/system/debug | /system/debug | ✅ | 404 dari menu. |
| Version Info | version | /dashboard/system/version | /system/version | ✅ | 404 dari menu. |

**Rekomendasi System (prioritas tinggi):**  
- **Opsi A:** Ubah semua href di menuConfig dari `/dashboard/system/...` menjadi `/system/...` agar URL sesuai route Next.js. TabContent sudah pakai id (database, console, dll) dan import dari `@/app/system/...`, jadi tab tetap berfungsi; yang perlu benar hanya URL.  
- **Opsi B:** Buat route di bawah dashboard dengan rewrite/redirect: mis. `app/dashboard/system/[[...slug]]/page.tsx` yang redirect ke `/system/...` sesuai slug.  
- File Monitor: belum ada route; tambah `app/system/file-monitor/page.tsx` (atau di bawah dashboard jika konsisten) + case di TabContent.

**RBAC:** Middleware saat ini hanya melindungi `/dashboard/audit` dan `/dashboard/database` (dan admin). Route `/system/*` tidak di-match oleh matcher `["/dashboard/:path*"]`, jadi **akses /system/* tidak melalui middleware** (bisa diakses tanpa session jika user tahu URL). Perlu diputuskan apakah /system/* harus dilindungi dan matcher diperluas.

---

## 8. Laporan (di luar menuConfig)

- **Route:** `app/dashboard/laporan/page.tsx` → `/dashboard/laporan`.  
- **Konten:** Halaman sangat minimal ("Laporan Dashboard").  
- **Menu:** Tidak ada di menuConfig; ada di BottomNav (`/dashboard/laporan`).  
- **TabContent:** Tidak ada case "laporan" → jika dibuka sebagai tab (mis. dari URL), akan fallback "Modul belum ditemukan" kecuali ada mapping lain.

**Rekomendasi:** Tambah "Laporan" ke menuConfig (mis. di Cathlab atau Tools) dan case `laporan` di TabContent, atau pastikan navigasi ke laporan tidak bergantung pada tab id.

---

## 9. Smart (di luar menuConfig)

Route ada di bawah `app/dashboard/smart/`:

- `/dashboard/smart/analytics` — placeholder teks  
- `/dashboard/smart/calculator` — placeholder  
- `/dashboard/smart/communication` — placeholder  
- `/dashboard/smart/integration` — (perlu cek isi)  
- `/dashboard/smart/monitoring` — placeholder  
- `/dashboard/smart/recommendation` — placeholder  

Tidak ada grup "Smart" di menuConfig; "Monitoring" dan "Analytics" mengarah ke path yang salah (lihat Cathlab & Tools).  
**Rekomendasi:** Sinkronkan menuConfig (Monitoring → smart/monitoring, Analytics → smart/analytics) dan tambah case di TabContent untuk id yang dipakai.

---

## 10. Admin Dashboard

- **Route:** `app/dashboard/admin/page.tsx` → `/dashboard/admin`.  
- **RBAC:** Middleware membatasi hanya role `admin`.  
- **Konten:** Sangat minimal (judul "Admin Dashboard").  
- **TabContent:** Case "admin" mengembalikan `<DashboardMain />` (bukan halaman admin khusus).

**Rekomendasi:** Jika halaman admin harus berbeda dari dashboard utama, ganti case "admin" di TabContent dengan komponen AdminPage; atau buat `app/dashboard/admin/page.tsx` yang lebih lengkap.

---

## Checklist Perbaikan Singkat

1. **System:** Ubah href di menuConfig dari `/dashboard/system/*` → `/system/*`.  
2. **Monitoring & Grafik (Cathlab):** Monitoring href → `/dashboard/smart/monitoring`, tambah case tab `monitoring`; Grafik → tambah route + tab atau sembunyikan.  
3. **Analytics (Tools):** href → `/dashboard/smart/analytics` dan tambah case tab `analytics` (atau id konsisten).  
4. **Laporan:** Tambah ke menuConfig + TabContent case `laporan` jika ingin bisa dibuka sebagai tab.  
5. **Modul belum ada (Registrasi, Hasil, Lab, Vendor, Logistik, User, Report, Pengaturan, File Monitor):** Entah tambah route + TabContent atau sembunyikan dari menu.  
6. **Middleware:** Pertimbangkan matcher untuk `/system/:path*` jika akses system harus login-only; sesuaikan adminRoutes jika modul Admin (vendor/logistik/user) harus admin-only.

---

*Audit ini berdasarkan struktur kode pada saat penulisan. Setelah perubahan route/menu, ada baiknya dijalankan lagi pengecekan manual (klik tiap menu, buka URL langsung, dan cek tab).*
