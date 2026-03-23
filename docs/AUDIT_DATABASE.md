# Audit Database — IDIK-App

**Tanggal audit:** 12 Maret 2025  
**Lingkup:** Semua referensi database (Supabase Postgres, Storage, IndexedDB/Dexie) dan konsistensi pemakaian di codebase.

---

## 1. Ringkasan

| Aspek | Status | Catatan |
|-------|--------|--------|
| **Backend DB** | Supabase (Postgres) | Satu project, schema `public` (+ `graphql_public`) |
| **Storage** | Supabase Storage | Bucket: `idik_exports`, `uploads` |
| **Local DB** | IndexedDB (Dexie) | `IDIK-LocalDB` — pasien offline, log_sync |
| **Schema resmi** | Sebagian | `app/data/schema/schema.sql` hanya pasien + tindakan; banyak tabel lain dipakai tanpa definisi di repo |
| **Tipe TypeScript** | Tidak lengkap | `lib/database.types.ts` hanya mendefinisikan `doctor`; tabel lain pakai `[key: string]: {}` atau `any` |
| **Naming inconsistency** | Ada | Tabel dokter: `doctor` vs `dokter`; audit: `audit_logs` vs `audit_log` |

---

## 2. Tabel Supabase (Postgres) yang Direferensi Kode

Tabel/view/function yang dipakai di aplikasi (dari `.from("...")`, `.rpc("...")`):

| Nama | Dipakai di | Keterangan |
|------|------------|------------|
| **pasien** | PasienProvider, addPatient, editPatient, deletePatient, realtime, usePasienSync, usePasienCrudBase, federationManager, getData | Tabel utama pasien |
| **view_pasien_full** | PasienProvider | View gabungan data pasien |
| **tindakan** | useTindakanCrud, useTindakanRealtime, useTindakanData, useTindakanStats, TindakanTable, getTindakanTerbaru, getTindakanMingguan | Tabel tindakan (beberapa modul) |
| **tindakan_medik** | tindakanQueries, tindakanRepository | Nama alternatif / view? — **duplikasi konsep dengan `tindakan`** |
| **doctor** | api/supabase, api/auth/users, ModalTambahDokter, lib/database.types | Tabel dokter (nama EN) |
| **dokter** | DokterContext (fetch, delete, insert, update) | Tabel dokter (nama ID) — **konflik dengan `doctor`** |
| **audit_logs** | app/api/audit/log.ts | Insert audit (kolom: user_id, action, endpoint, ip, details, timestamp) |
| **audit_log** | app/api/audit/log/route.ts | GET/POST audit (kolom: event_type, action, module, actor, metadata, ip_address, status, created_at) — **skema beda dengan audit_logs** |
| **api_keys** | apiKeys.server.ts, useAPIKeys | API keys |
| **api_key_logs** | apiKeys.server.ts | Log penggunaan API key |
| **system_filelog** | WatcherService, api/system/files | Log file sistem |
| **system_logs** | lib/ai-core, AnalyticsHub | Log sistem / AI |
| **system_audit** | api/auth/get | Audit auth |
| **logs** | ConsoleLogs, api/logs/route | Log konsol / aplikasi |
| **users** | api/dashboard/route | User dashboard (mungkin view/auth) |
| **ping** | SupabaseStatus | Tabel health check |
| **information_schema.tables** | getTables.ts | Metadata (bukan tabel aplikasi) |
| **information_schema.columns** | getColumns.ts, system/database/[table]/page | Metadata |

### RPC (Stored Procedures)

| RPC | Dipakai di |
|-----|------------|
| **get_tables** | system/database/actions.ts |
| **list_tables** | lib/supabaseMeta.ts |
| **list_columns** | lib/supabaseMeta.ts |
| **list_all_tables** | api/database/tables/route.ts |
| **exec_sql** | system/database/[table]/page.tsx, api/database/create/route.ts |
| **execute_raw_sql** | api/database/query/route.ts |

---

## 3. Inkonsistensi Kritis

### 3.1 Tabel dokter: `doctor` vs `dokter`

- **`doctor`**: didefinisikan di `lib/database.types.ts`, dipakai di `api/supabase/route.ts`, `api/auth/users/route.ts`, `ModalTambahDokter.tsx`.
- **`dokter`**: dipakai di `DokterContext.tsx` (CRUD penuh).

**Rekomendasi:** Pilih satu nama tabel di Supabase (`doctor` atau `dokter`), lalu seragamkan semua referensi. Jika tabel di DB bernama `doctor`, ubah `DokterContext.tsx` agar memakai `.from("doctor")` dan mapping kolom jika perlu.

### 3.2 Audit: `audit_logs` vs `audit_log`

- **`audit_logs`** (app/api/audit/log.ts): kolom `user_id`, `action`, `endpoint`, `ip`, `details`, `timestamp`.
- **`audit_log`** (app/api/audit/log/route.ts): kolom `event_type`, `action`, `module`, `actor`, `metadata`, `ip_address`, `status`, `created_at`.

Dua skema berbeda. Satu dipakai untuk logging dari Route Handler (log.ts), satu untuk API audit admin (route.ts).

**Rekomendasi:**  
- Gabungkan ke satu tabel audit (mis. `audit_log`) dengan kolom yang mencakup kedua kebutuhan, atau  
- Pisah jelas: satu untuk “app audit trail” (log.ts) dan satu untuk “admin audit API”, dengan nama berbeda (mis. `app_audit_log` vs `audit_log`) dan dokumentasi.

### 3.3 Tindakan: `tindakan` vs `tindakan_medik`

- **`tindakan`**: dipakai di modul layanan/tindakan (hooks, actions, TindakanTable).
- **`tindakan_medik`**: dipakai di `tindakanQueries.ts` dan `tindakanRepository.ts`.

**Rekomendasi:** Pastikan di DB hanya ada satu entitas (tabel atau view). Jika `tindakan_medik` adalah view atas `tindakan`, dokumentasikan; jika duplikat, hapus salah satu dan seragamkan kode ke satu nama.

---

## 4. Supabase Client — Siapa Pakai Apa

Berbagai cara instansiasi client dipakai:

| Sumber | Tipe | Penggunaan |
|--------|------|------------|
| **lib/supabase/server-.ts** | Server (SSR, cookies) | Auth, pasien/add, api-keys, dashboard, users, login |
| **lib/supabase/server.ts** | Server (anon, sync) | addPatient, getData, audit/log.ts — **tanpa cookie** |
| **lib/supabase/admin.ts** | Admin (service role) | audit/log/route, database/query, database/tables, database/columns |
| **lib/supabase/supabaseClient.ts** | Browser (anon + Database types) | PasienProvider, ai-core, supabaseClient dipakai banyak modul |
| **lib/supabaseClient.ts** | Browser (anon, no types) | auth-debug, legacy |
| **lib/safeSupabase.ts** | Browser (anon, bisa null) | Fallback offline |
| **@supabase/supabase-js** (langsung) | Bervariasi | getColumns, getTables, editPatient, deletePatient, realtime, TindakanTable, logs, dll. — **banyak duplikasi env** |
| **createClientComponentClient** (@supabase/auth-helpers-nextjs) | Browser (dengan session) | Tindakan (hooks), DokterContext, AutonomousSupervisor |
| **app/api/supabase/client.ts** | Server (SSR) | - |
| **app/api/_supabase/server.ts** | Server (SSR) | system/files, WatcherService |
| **core/services/supabaseClient.ts** | Langsung anon | tindakanQueries, dll. |
| **app/data/connectors/supabaseConnector.ts** | Langsung anon | Connector |

**Rekomendasi:**  
- Route Handler / Server Action: satu pintu (mis. `createClient()` dari `server-.ts` yang baca cookie).  
- Jangan pakai `createClient(env...)` langsung di banyak file; pakai helper dari `lib/supabase/*` atau `app/api/_supabase/server.ts`.  
- Hapus atau deprecate `lib/supabaseClient.ts` vs `lib/supabase/supabaseClient.ts` — pilih satu nama dan satu lokasi.

---

## 5. TypeScript Types (Database)

- **lib/database.types.ts**: Hanya mendefinisikan `Doctor` dan `Database['public']['Tables']['doctor']`. Semua tabel lain tidak punya Row/Insert/Update.
- **@/types/supabase**: Diimpor di `useTindakanCrud.ts` (modules/tindakan) — file `types/supabase.ts` tidak ada di repo (mungkin generated atau belum di-commit).
- **app/dashboard/pasien/types/pasien.ts**: Tipe domain Pasien (camelCase) dengan komentar mapping ke Supabase (snake_case).
- **app/dashboard/dokter/types/doctor.ts**: Tipe Doctor (snake_case) — konsisten dengan kemungkinan tabel `dokter`/`doctor`.

**Rekomendasi:**  
- Generate types dari Supabase (supabase gen types typescript) ke satu file (mis. `lib/database.types.ts` atau `types/supabase.ts`) dan pakai di semua client.  
- Hapus atau perbaiki import `@/types/supabase` jika file tidak ada.

---

## 6. Schema & Migrasi

- **app/data/schema/schema.sql**: Hanya `pasien` dan `tindakan` (definisi sederhana). Tidak ada dokter, audit, api_keys, system_*, logs, dll.
- **supabase/config.toml**:  
  - `schema_paths = []` → tidak ada schema files yang di-load.  
  - `sql_paths = ["./seed.sql"]` → seed ada; file `supabase/seed.sql` tidak terlihat di daftar file (cek ada/tidak).
- **scripts/dbSync.ts**: Komentar menyebut “IDIK-App Core Database Schema” dan `doctors` (plural) — tidak konsisten dengan kode yang pakai `doctor`/`dokter`.

**Rekomendasi:**  
- Definisikan semua tabel yang dipakai (doctor/dokter, audit_log(s), api_keys, api_key_logs, system_filelog, system_logs, logs, users, dll.) dalam migration atau schema SQL di `supabase/migrations` atau `supabase/schemas`.  
- Isi `schema_paths` jika memakai file schema.  
- Satu sumber kebenaran untuk nama tabel (mis. `doctor` vs `dokter`) dan sesuaikan script + kode.

---

## 7. Storage (Supabase)

- **idik_exports**: `exporters/uploader/supabaseUploader.ts` — upload & get public URL.
- **uploads**: `senders/supabaseUploader.ts` — upload.

Kedua bucket perlu ada di project Supabase dan kebijakan akses (RLS/Storage policy) harus jelas (siapa boleh baca/tulis).

---

## 8. IndexedDB (Dexie) — IDIK-LocalDB

- **Tabel:** `pasien`, `log_sync`.
- **Kegunaan:** Pasien offline, sync status (pending/synced/failed).
- **Lokasi:** `core/db/idikDexie.ts`.

Tidak ada konflik dengan audit ini; pastikan sync ke Supabase hanya menulis ke tabel `pasien` (dan mungkin audit jika diinginkan) yang sudah didokumentasikan di atas.

---

## 9. Tabel “Test” / Mungkin Tidak Ada

- **patients** (testSupabase.ts): Hanya di script test — pastikan tidak dipakai di production.
- **ping** (SupabaseStatus): Untuk health check — tabel ini harus ada di DB atau diganti dengan endpoint lain.

---

## 10. Checklist Tindak Lanjut

- [x] Putuskan dan seragamkan: **doctor** vs **dokter** — pakai tabel **doctor**; DokterContext diseragamkan (Mar 2025).
- [ ] Seragamkan audit: **audit_logs** vs **audit_log** (satu skema atau dua tabel dengan nama dan tujuan jelas).
- [x] Seragamkan tindakan: **tindakan** vs **tindakan_medik** — tabel **tindakan** + view **tindakan_medik** (Mar 2025).
- [x] Tambah definisi tabel modul ke migration Supabase: pasien, doctor, tindakan, inventaris, pemakaian, view_pasien_full (Mar 2025).
- [ ] Generate dan pakai satu set Database types dari Supabase; perbaiki/remove import `@/types/supabase` yang tidak ada.
- [ ] Kurangi duplikasi pembuatan client: pakai helper server/browser/admin yang sudah ada; hapus createClient(env) inline di banyak file.
- [ ] Pastikan Storage bucket `idik_exports` dan `uploads` ada dan kebijakan aksesnya terdokumentasi.
- [ ] Cek keberadaan `supabase/seed.sql` dan isi `schema_paths` di config.toml jika dipakai.

---

*Dokumen ini dihasilkan dari pemindaian kode (grep/read) terhadap referensi database. Untuk kebenaran skema aktual di Supabase, bandingkan dengan Supabase Dashboard atau `supabase db dump`.*
