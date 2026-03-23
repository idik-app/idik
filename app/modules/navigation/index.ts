/*───────────────────────────────────────────────
 ⚙️ moduleRegistry – Cathlab JARVIS Mode v6.0
   🔹 Registrasi semua modul utama IDIK-App
   🔹 Mendukung dynamic loader (TabContext / Router)
───────────────────────────────────────────────*/

import DashboardMain from "@/components/dashboard/DashboardMain";
import { PasienView } from "@/modules/pasien";
import { DokterView } from "@/modules/dokter";
import { InventarisView } from "@/modules/inventaris";
import { TindakanView } from "@/modules/tindakan/ui/TindakanView";
import { AnalyticsView } from "@/modules/analytics/ui/AnalyticsView";

/**
 * 🧠 moduleRegistry
 * Digunakan oleh dynamic loader (TabContext / DashboardRouter)
 * untuk menentukan komponen yang akan ditampilkan.
 */
export const moduleRegistry: Record<string, React.ComponentType<any>> = {
  dashboard: DashboardMain,
  pasien: PasienView,
  dokter: DokterView,
  inventaris: InventarisView,
  tindakan: TindakanView, // ✅ modul baru
  analytics: AnalyticsView,
};

/**
 * Helper untuk mendapatkan modul berdasarkan id.
 * Jika modul tidak ditemukan, kembalikan undefined.
 */
export function getModuleById(id: string) {
  return moduleRegistry[id];
}
