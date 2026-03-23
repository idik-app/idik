# Visi IDIK-App: JARVIS untuk Cathlab

IDIK-App didesain dengan inspirasi **JARVIS** (Just A Rather Very Intelligent System) dari Iron Man: sistem asisten cerdas yang otonom, selalu siap, dan mendukung keputusan di Cathlab.

---

## Prinsip

- **Autonomous** — Sistem memantau koneksi, event, dan integritas data tanpa menunggu perintah.
- **Assistant-first** — Pesan ke pengguna (notifikasi, loading, empty state) terdengar seperti asisten yang melaporkan status.
- **HUD (Heads-Up Display)** — Informasi penting (koneksi, event, mode) tersedia di satu tempat tanpa mengganggu kerja.
- **Event-driven** — Modul (pasien, tindakan, inventaris) berkomunikasi lewat Event Bridge; HUD dan log merekam aktivitas.

---

## Glosarium (istilah konsisten)

| Istilah | Arti | Dipakai di |
|--------|------|------------|
| **JARVIS Mode** | Mode antarmuka/UX dengan nuansa asisten cerdas (efek, copy, HUD). | Cinematic intro, loader, dashboard |
| **Autonomous Kernel** | Lapisan logic yang menjalankan pemantauan dan penyesuaian otomatis. | Diagnostics HUD, AutonomousKernel (core) |
| **Supervisor** | Komponen yang memantau koneksi (mis. Supabase) dan mengupdate status ke Bridge. | Layout, AutonomousSupervisor |
| **Diagnostics Bridge** | State global untuk status koneksi + jumlah event + last update (Zustand). | HUD, Supervisor, Kernel |
| **Diagnostics HUD** | Panel tetap (mis. kanan bawah) yang menampilkan status Kernel + log event. | Dashboard layout |
| **Event Bridge** | Pub/sub untuk event antar modul (pasien:added, system:error, dll.). | EventBridgeContext, EventBridgeToHUD |
| **Realtime Events** | Jumlah event dari Supabase Realtime atau Event Bridge yang tercatat. | HUD |
| **Integrity / Stable** | Indikator bahwa sistem dalam keadaan aman (tanpa anomali/rollback). | HUD |

---

## Audit komponen JARVIS (referensi)

| Komponen | Path | Peran |
|----------|------|--------|
| AutonomousSupervisor | core/idik-autonomous/AutonomousSupervisor.ts | Init di layout; pantau koneksi; update DiagnosticsBridge. |
| AutonomousKernel | core/idik-autonomous/AutonomousKernel.ts | Loop cognition + recovery (stub); dipakai lewat AutonomousKernelProvider. |
| DiagnosticsBridge | core/idik-autonomous/DiagnosticsBridge.ts | Zustand: supabaseStatus, realtimeEvents, lastUpdate. |
| DiagnosticsHUD | app/dashboard/ui/DiagnosticsHUD.tsx | Panel HUD: Kernel, Events, CPU, Integrity, Log. |
| DiagnosticsHUDContext | app/contexts/DiagnosticsHUDContext.tsx | Daftar event untuk log HUD (addEvent, clearEvents). |
| EventBridgeContext | app/contexts/EventBridgeContext.tsx | Subscribe / emit event antar modul. |
| EventBridgeToHUD | app/dashboard/ui/EventBridgeToHUD.tsx | Meneruskan event (pasien, inventaris, system) ke HUD. |
| JarvisScanner | components/effects/JarvisScanner | Efek visual hologram di dashboard/pasien. |
| JarvisLoader | components/JarvisLoader.tsx | Loader dengan nuansa JARVIS. |
| CinematicIntro | components/ui/CinematicIntro.tsx | Intro landing dengan “INITIALIZING JARVIS MODE”. |
| Dashboard navbar | components/dashboard/DashboardNavbar.tsx | Tagline “Autonomous Cathlab Intelligence”. |

Copy yang konsisten dengan glosarium di atas dipakai di komponen-komponen ini dan di pesan notifikasi/loading/empty state (lihat Tahap 2).
