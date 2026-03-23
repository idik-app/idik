# Audit: DiagnosticsHUDContext, EventBridgeContext, EventBridgeToHUD, DiagnosticsHUD

**Tanggal:** 2025-03-13  
**Lingkup:** Peran, alur data, dan inkonsistensi antar komponen diagnostics/bridge.

---

## 0. Apakah mereka aktif?

**Ya, semuanya aktif** ketika user membuka rute di bawah **`/dashboard`** (setelah login/redirect ke `/dashboard`).

| Entitas | Aktif? | Catatan |
|--------|--------|--------|
| **EventBridgeContext** | ✅ Aktif | Provider ada di root layout dan lagi di dashboard layout. Saat di `/dashboard/*`, modul Pasien/Tindakan memakai context ini (emit/subscribe). |
| **DiagnosticsHUDContext** | ✅ Aktif | Provider sama. EventBridgeToHUD memanggil `addEvent()` saat ada event pasien/system. Data terisi, tapi **tidak ada UI yang menampilkan** `events[]`. |
| **EventBridgeToHUD** | ✅ Aktif | Hanya di-render di `app/dashboard/layout.tsx`. Subscribe ke EventBridge jalan; setiap `pasien:added` dll menambah event ke DiagnosticsHUDContext. |
| **DiagnosticsHUD** (dashboard/ui) | ✅ Aktif | Di-render di dashboard layout; HUD "Autonomous Kernel" terlihat di kanan bawah. **Tapi** tidak ada yang pernah `emit("kernel:update", ...)` sehingga angka (Realtime Events, CPU, Integrity) tetap default (0, 0%, Stable). |

**Kapan tidak aktif:** Di rute di luar `/dashboard` (mis. `/`, `/about`, `/system`), layout dashboard tidak dipakai, jadi **EventBridgeToHUD** dan **DiagnosticsHUD** tidak ter-mount. Provider EventBridge + DiagnosticsHUD tetap ada di root layout, jadi `useEventBridge()` / `useDiagnosticsHUD()` tetap tersedia bila dipanggil dari halaman tersebut.

---

## 1. Ringkasan Peran

| Entitas | Peran | Lokasi |
|--------|--------|--------|
| **EventBridgeContext** | Pub/sub global: `emit(event, data)` dan `subscribe(event, callback)`. Menghubungkan modul (Pasien, Tindakan, dll) tanpa coupling langsung. | `app/contexts/EventBridgeContext.tsx` |
| **DiagnosticsHUDContext** | State untuk log event HUD: `events[]`, `addEvent()`, `clearEvents()`. Menyimpan hingga 50 event terakhir untuk ditampilkan di UI. | `app/contexts/DiagnosticsHUDContext.tsx` |
| **EventBridgeToHUD** | Jembatan: subscribe ke EventBridge → panggil `addEvent()` DiagnosticsHUDContext. Tidak render UI (return `null`). | `app/dashboard/ui/EventBridgeToHUD.tsx` |
| **DiagnosticsHUD** (beragam) | Komponen UI yang menampilkan status/kernel/event. Ada beberapa implementasi berbeda. | Lihat §4. |

---

## 2. EventBridgeContext

- **API:** `subscribe(event, cb)`, `emit(event, data?)`.
- **Pemakai emit:**
  - **Pasien:** `usePasienCrudBase` → `pasien:added`, `pasien:updated`, `pasien:deleted`, `pasien:duplicate`, `system:error`.
  - **Tindakan:** `useTindakanEventBridge` → `tindakan:open-detail`, `tindakan:open-editor`, `tindakan:refresh`, `tindakan:changed`, `tindakan:warning`, `tindakan:diagnostics`.
- **Pemakai subscribe:**
  - **EventBridgeToHUD** → pasien:*, inventaris:*, monitoring:*, system:error (lalu forward ke DiagnosticsHUDContext).
  - **app/dashboard/ui/DiagnosticsHUD** → `kernel:update` (meta: events, cpu, stable).
  - **useTindakanEventBridge** → optional subscribe ke `kernel:update`.

**Tempat provider:**  
- `app/layout.tsx`: `EventBridgeProvider` di root.  
- `app/dashboard/layout.tsx`: `EventBridgeProvider` lagi (duplikat di scope dashboard).

---

## 3. DiagnosticsHUDContext

- **State:** `events: HudEvent[]` (id, time, module, type, message, level), max 50.
- **API:** `addEvent(e)`, `clearEvents()`.
- **Siapa yang mengisi:** Hanya **EventBridgeToHUD** (subscribe EventBridge → `addEvent`).
- **Siapa yang baca:** **Tidak ada komponen di layout dashboard yang memakai `useDiagnosticsHUD()` untuk menampilkan `events`.**  
  Jadi data event yang dikumpulkan EventBridgeToHUD saat ini **tidak ditampilkan** di HUD yang di-render di dashboard layout.

**Tempat provider:**  
- `app/layout.tsx`: `DiagnosticsHUDProvider` di root.  
- `app/dashboard/layout.tsx`: `DiagnosticsHUDProvider` lagi (duplikat).

---

## 4. EventBridgeToHUD

- **Peran:** Subscribe ke daftar event EventBridge tetap, lalu setiap payload diteruskan ke `addEvent()` DiagnosticsHUDContext.
- **Event yang didengarkan:**
  - `pasien:added`, `pasien:updated`, `pasien:deleted`
  - `inventaris:stok_low`, `monitoring:room_busy`, `system:error`
- **Tidak didengarkan:** Event Tindakan (`tindakan:*`) tidak ada dalam list; bila ingin log Tindakan di HUD, daftar ini perlu diperluas.
- **Render:** `return null` (invisible bridge).

**Hanya dipasang di:** `app/dashboard/layout.tsx`. Di root layout tidak ada EventBridgeToHUD, sehingga di luar dashboard tidak ada yang mengisi DiagnosticsHUDContext dari EventBridge.

---

## 5. Komponen “DiagnosticsHUD” (banyak implementasi)

Ada beberapa komponen dengan nama serupa; peran dan sumber data berbeda:

| File | Peran | Sumber data |
|------|--------|-------------|
| **app/dashboard/ui/DiagnosticsHUD.tsx** | HUD “Autonomous Kernel”: events count, CPU, integrity/stable. | Hanya **EventBridgeContext** → `kernel:update`. **Tidak** pakai DiagnosticsHUDContext (tidak menampilkan event log). |
| **components/DiagnosticsHUD.tsx** | HUD v4.4 per modul (Pasien, Tindakan, dll): online, events count, last update. | `navigator.onLine`, event `jarvis-realtime`, optional PasienContext. **Tidak** pakai EventBridgeContext atau DiagnosticsHUDContext. |
| **components/hud/DiagnosticsHUD.tsx** | HUD minimal: “SUPABASE CONNECTED”, waktu. | State lokal (waktu). Tidak pakai context. |
| **app/system/DiagnosticsHUD.tsx** | HUD status DB: Supabase OK/ERR, latency. | DatabaseContext. |
| **app/dashboard/layanan/tindakan/components/DiagnosticsHUD.tsx** | File kosong. | - |

**Yang di-render di dashboard layout:** Hanya `app/dashboard/ui/DiagnosticsHUD.tsx` (via `@/dashboard/ui/DiagnosticsHUD`). Itu hanya menampilkan kernel meta, bukan daftar event dari DiagnosticsHUDContext.

---

## 6. Alur Data (ringkas)

```
[Modul Pasien/Tindakan]
    → emit(event, data)  →  EventBridgeContext
                                ↓
            ┌───────────────────┴───────────────────┐
            ↓                                       ↓
   EventBridgeToHUD                        app/dashboard/ui/DiagnosticsHUD
   (subscribe pasien/*, etc)               (subscribe "kernel:update")
            ↓                                       ↓
   addEvent() → DiagnosticsHUDContext       UI: Realtime Events, CPU, Integrity
            ↓
   events[] (max 50)
            ↓
   ❌ Tidak ada komponen yang render events[] di layout dashboard
```

---

## 7. Temuan & Rekomendasi

### 7.1 Event log HUD tidak tampil

- **DiagnosticsHUDContext** diisi oleh **EventBridgeToHUD**, tetapi **tidak ada UI** di layout dashboard yang memanggil `useDiagnosticsHUD()` dan menampilkan `events`.
- **Rekomendasi:** Tambah panel/list di HUD (atau komponen terpisah) yang memakai `useDiagnosticsHUD()` dan render `events` (dan optional `clearEvents`), atau hapus EventBridgeToHUD + pengisian DiagnosticsHUDContext bila fitur log tidak dibutuhkan.

### 7.2 Duplikasi provider

- **EventBridgeProvider** dan **DiagnosticsHUDProvider** dipasang di **app/layout.tsx** dan lagi di **app/dashboard/layout.tsx**. Dashboard children dapat memakai provider dari root; provider kedua di dashboard membuat dua tree context terpisah untuk bagian dashboard.
- **Rekomendasi:** Pakai satu lapis provider (biasanya di root `app/layout.tsx`) dan hapus dari `app/dashboard/layout.tsx`. Jika ingin HUD hanya di dashboard, tetap satu provider di root, hanya posisi render **EventBridgeToHUD** dan **DiagnosticsHUD** yang bisa tetap di dashboard layout.

### 7.3 Event Tindakan tidak di-forward ke HUD

- **EventBridgeToHUD** hanya subscribe ke pasien:*, inventaris:*, monitoring:*, system:error. Event **tindakan:*** (termasuk `tindakan:diagnostics`) tidak di-subscribe, sehingga tidak masuk ke DiagnosticsHUDContext.
- **Rekomendasi:** Jika log Tindakan harus tampil di HUD yang sama, tambahkan event `tindakan:diagnostics` (dan lain yang relevan) ke daftar subscribe di EventBridgeToHUD.

### 7.4 Banyak komponen bernama “DiagnosticsHUD”

- Beberapa file/komponen bernama DiagnosticsHUD dengan perilaku dan sumber data berbeda; impor dari path berbeda (`@/app/dashboard/ui/`, `@/components/DiagnosticsHUD`, `@/components/DiagnosticsHUD`, dll) rawan bingung.
- **Rekomendasi:** Standarkan nama/path (mis. satu komponen utama `DiagnosticsHUD` di `app/dashboard/ui/` yang bisa menampilkan kernel + event log), dan komponen lain rename/refactor (mis. `DatabaseStatusHUD`, `SupabaseStatusHUD`, `ModuleStatusHUD`) agar peran jelas dan impor konsisten.

### 7.5 File DiagnosticsHUD kosong

- **app/dashboard/layanan/tindakan/components/DiagnosticsHUD.tsx** kosong.
- **Rekomendasi:** Hapus file atau ekspor re-export dari satu implementasi yang dipilih (mis. dari `@/app/dashboard/ui/DiagnosticsHUD`) agar tidak ada dead code.

### 7.6 Realtime Events & Log — siapa yang mengisi (audit 2025-03-12)

- **Log (HUD):** Sudah terhubung. **EventBridgeToHUD** subscribe ke `pasien:*`, `system:error`, `tindakan:*` (changed, diagnostics, warning, refresh, open-detail, open-editor). **usePasienCrudBase** dan **useTindakanEventBridge** memakai **EventBridgeContext** global dan memanggil `emit(...)`, sehingga saat user menambah/edit/hapus pasien atau trigger aksi Tindakan, event masuk ke DiagnosticsHUDContext dan tampil di bagian **Log** panel Autonomous Kernel.
- **Realtime Events (counter):** Awalnya selalu 0 karena **DiagnosticsBridge.eventReceived()** hanya dipanggil di **AutonomousSupervisor.registerRealtime()**, dan **tidak ada kode yang memanggil registerRealtime()**. Supabase realtime (postgres_changes) dipakai di usePasienCrudBase, useTindakanRealtime (dua lokasi), PasienRealtime, PasienProvider, dll., tetapi tidak ada yang memanggil `DiagnosticsBridge.eventReceived()`.
- **Perbaikan:** Memanggil **DiagnosticsBridge.eventReceived()** di handler postgres_changes di:
  - **app/dashboard/pasien/contexts/usePasienCrudBase.ts** (tabel `pasien`)
  - **app/dashboard/layanan/tindakan/hooks/useTindakanRealtime.ts** (tabel `tindakan`)
  - **app/modules/tindakan/hooks/useTindakanRealtime.ts** (tabel `tindakan`)
  Setelah itu, angka **Realtime Events** di HUD naik setiap ada perubahan data di tabel pasien/tindakan (INSERT/UPDATE/DELETE).

---

## 8. Checklist singkat

- [ ] Tampilkan event log dari DiagnosticsHUDContext di UI, atau stop mengisi context tersebut.
- [ ] Satu lapis EventBridgeProvider + DiagnosticsHUDProvider (umumnya di root); sesuaikan dashboard layout.
- [x] Event Tindakan sudah di-subscribe di EventBridgeToHUD (tindakan:changed, tindakan:diagnostics, dll.).
- [x] Realtime Events: DiagnosticsBridge.eventReceived() sudah dipanggil di handler realtime pasien & tindakan (§7.6).
- [ ] Unifikasi/rename komponen DiagnosticsHUD dan impor.
- [ ] Hapus atau isi `app/dashboard/layanan/tindakan/components/DiagnosticsHUD.tsx`.
