# Audit Level & Role — IDIK-App

**Tanggal:** 12 Maret 2025  
**Ringkasan:** 11 level role dari terendah (pasien) hingga tertinggi (superadmin), dengan matriks akses dan rekomendasi implementasi.

---

## 1. Hierarki Level (dari terendah ke tertinggi)

| Level | Role           | Keterangan singkat |
|-------|----------------|--------------------|
| 1     | **pasien**     | Subjek data; tidak akses dashboard staff (portal pasien saja jika ada). |
| 2     | **dokter**     | Akses modul dokter, baca pasien & tindakan. |
| 3     | **perawat**    | Pasien, inventaris, pemakaian, tindakan (operasional harian). |
| 4     | **IT**         | Akses teknis: system, api-keys, console; tidak manage user. |
| 5     | **radiografer**| Modul radiologi / hasil pemeriksaan. |
| 6     | **casemix**    | Laporan, coding, data untuk casemix. |
| 7     | **admin**      | Admin operasional: dashboard admin, sebagian system. |
| 8     | **administrator** | Hampir penuh: user management, audit view; bukan superadmin. |
| 9     | **superadmin** | Penuh: audit log, database console, semua system. |
| 10    | **distributor** | Akses modul vendor/distributor (master data & transaksi terkait). |
| 11    | **depo_farmasi** | Akses operasional depo farmasi (stok, permintaan, dispensing). |

---

## 2. Matriks Akses per Modul (rekomendasi)

| Modul / Fitur              | pasien | dokter | perawat | IT | radiografer | casemix | distributor | depo_farmasi | admin | administrator | superadmin |
|----------------------------|--------|--------|---------|----|-------------|---------|-------|----------------|------------|
| Dashboard utama            | —      | ✅     | ✅      | ✅ | ✅          | ✅      | ✅          | ✅           | ✅    | ✅             | ✅         |
| Pasien (CRUD/baca)         | —*     | baca   | ✅      | —  | baca        | baca    | —           | —            | ✅    | ✅             | ✅         |
| Dokter                     | —      | ✅     | baca    | —  | —           | —       | —           | —            | ✅    | ✅             | ✅         |
| Inventaris & Pemakaian     | —      | —      | ✅      | —  | —           | baca    | —           | ✅           | ✅    | ✅             | ✅         |
| Tindakan medis             | —      | ✅     | ✅      | —  | ✅          | baca    | —           | baca         | ✅    | ✅             | ✅         |
| Hasil / Radiologi          | —      | baca   | baca    | —  | ✅          | baca    | —           | baca         | ✅    | ✅             | ✅         |
| Laporan & Analytics        | —      | baca   | baca    | —  | baca        | ✅      | baca        | baca         | ✅    | ✅             | ✅         |
| Vendor / Distributor       | —      | —      | —       | —  | —           | —       | ✅          | —            | ✅    | ✅             | ✅         |
| Depo Farmasi               | —      | —      | —       | —  | —           | —       | —           | ✅           | ✅    | ✅             | ✅         |
| System (diagnostics, console) | —   | —      | —       | ✅ | —           | —       | —           | —            | baca  | ✅             | ✅         |
| API Keys / Debug           | —      | —      | —       | ✅ | —           | —       | —           | —            | —     | —              | ✅         |
| Audit log (lihat)          | —      | —      | —       | —  | —           | —       | —           | —            | —     | ✅             | ✅         |
| Database console / query   | —      | —      | —       | —  | —           | —       | —           | —            | —     | —              | ✅         |
| Manajemen user (app_users) | —      | —      | —       | —  | —           | —       | —           | —            | —     | ✅             | ✅         |

- **✅** = read + write (sesuai kebutuhan modul)  
- **baca** = read only  
- **—** = no access  
- **—\*** = pasien hanya lihat data diri sendiri jika ada portal pasien.

---

## 3. Redirect setelah login (routeMap)

Rekomendasi halaman pertama setelah login:

| Role           | Target redirect (rekomendasi)   |
|----------------|---------------------------------|
| pasien         | `/dashboard` atau portal pasien |
| dokter         | `/dashboard/dokter` atau `/dashboard/pasien` |
| perawat        | `/dashboard/pasien`            |
| IT             | `/system` atau `/dashboard`    |
| radiografer    | `/dashboard/layanan/hasil` atau `/dashboard/pasien` |
| casemix        | `/dashboard/laporan`          |
| distributor    | `/dashboard/vendor`           |
| depo_farmasi   | `/dashboard/farmasi/master`   |
| admin          | `/dashboard/admin`             |
| administrator  | `/dashboard/admin`             |
| superadmin     | `/dashboard/admin` atau `/system` |

---

## 4. Saran Pamungkas Implementasi

### 4.1 Database (`app_users`)

- **Sekarang:** constraint `role in ('admin', 'staff', 'user')`.
- **Tindakan:** Tambah semua role di atas dalam migration:

```sql
-- Contoh: ubah check constraint
alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check check (role in (
    'pasien', 'dokter', 'perawat', 'it', 'radiografer',
    'casemix', 'distributor', 'depo_farmasi',
    'admin', 'administrator', 'superadmin'
  ));
```

- Simpan role di DB dalam **lowercase** (mis. `superadmin`, `administrator`).

### 4.2 Middleware (RBAC)

- **Sekarang:** Hanya `admin` yang boleh ke `/dashboard/admin`, `/dashboard/audit`, `/dashboard/database`.
- **Tindakan:**
  - Route **hanya superadmin:** `/system/database`, `/system/database/audit`, `/api/database/*` (query/tables), `/api/audit/log`.
  - Route **administrator atau superadmin:** `/dashboard/admin`, manajemen user, view audit.
  - Route **admin / administrator / superadmin:** dashboard admin; bedakan akses “lihat audit” vs “query database” (hanya superadmin).
  - Definisikan array `superadminOnlyRoutes` dan `administratorOrAboveRoutes` di `middleware.ts`, lalu cek `role` terhadap array tersebut.

### 4.3 Access Matrix (kode)

- **File:** `app/governance/accessMatrix.ts`.
- **Tindakan:** Ganti role generik (`admin`, `staff`, `guest`) dengan 9 role di atas dan definisikan kemampuan per role (read, write, audit, database, user_management). Contoh:

```ts
export const AccessMatrix: Record<string, ("read" | "write" | "audit" | "database" | "user_management")[]> = {
  pasien: [],
  dokter: ["read"],
  perawat: ["read", "write"],
  it: ["read"],
  radiografer: ["read", "write"],
  casemix: ["read"],
  distributor: ["read", "write"],
  depo_farmasi: ["read", "write"],
  admin: ["read", "write"],
  administrator: ["read", "write", "audit", "user_management"],
  superadmin: ["read", "write", "audit", "database", "user_management"],
};
```

- Di sisi API route, gunakan helper mis. `requireRole(["administrator", "superadmin"])` atau `requireSuperadmin()` agar konsisten dengan middleware.

### 4.4 Menu & navigasi

- **File:** `app/config/menuConfig.tsx` (dan komponen yang baca menu).
- **Tindakan:** Tambah properti `roles?: string[]` pada setiap item menu; di sidebar/tab hanya tampilkan item yang `roles`-nya mencakup role user saat ini. Jika `roles` kosong/undefined, anggap “semua role yang sudah login” (kecuali pasien jika tidak pakai dashboard staff).

### 4.5 API Auth (`app/api/auth/route.ts`)

- **routeMap:** Perluas dengan 9 role dan target redirect seperti Tabel §3.
- **Fallback dev:** Tambah contoh user per role (satu saja cukup) untuk development.

### 4.6 Audit log

- Setiap aksi sensitif (ubah pasien, ubah user, query database, akses audit log) catat ke tabel audit dengan kolom **actor_role** (dan user_id). Berguna untuk “siapa (role apa) melakukan apa”.
- Hanya **administrator** dan **superadmin** yang boleh **lihat** audit log; **superadmin** saja yang boleh akses penuh ke database/console.

### 4.7 Prioritas implementasi

1. **P1:** Migration `app_users` + perluas `routeMap` di auth + middleware (superadmin vs administrator vs admin).
2. **P2:** Access matrix + `requireRole` / `requireSuperadmin` di API yang sensitif (audit, database, users).
3. **P3:** Menu/sidebar filter by role + dokumentasi siapa boleh akses apa.

---

## 5. Ringkasan satu halaman

| Yang dilakukan | Detail |
|----------------|--------|
| **9 level** | pasien → dokter → perawat → IT → radiografer → casemix → admin → administrator → superadmin. |
| **DB** | Role di `app_users` diperluas (constraint + seed); simpan lowercase. |
| **Middleware** | Superadmin-only: database console & audit API; administrator+: view audit & user management. |
| **Kode** | Access matrix 9 role; routeMap 9 target; menu filter by role; API guard by role. |
| **Audit** | Catat actor_role; hanya administrator/superadmin yang boleh lihat audit log. |

Langkah berikut yang paling berdampak: **P1** (DB + auth redirect + middleware RBAC), lalu **P2** (API guard + access matrix), lalu **P3** (menu by role).
