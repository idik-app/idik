"use server";
/**
 * 🧩 IDIK-App Bootstrap Configuration
 * -----------------------------------
 * File ini mengatur perilaku regeneratif otomatis:
 * - Mode (manual | auto)
 * - Interval pembelajaran ulang
 * - Level keamanan & logging
 * - Modul yang diaktifkan
 */

export interface BootstrapConfig {
  mode: "manual" | "auto"; // auto = self-boot saat server start
  securityLevel: "low" | "medium" | "high";
  retrainInterval: number; // dalam jam
  enableTelemetry: boolean;
  enableAnomalyMonitor: boolean;
  activeModules: string[];
  logPolicy: "silent" | "normal" | "verbose";
}

export const IDIK_BOOT_CONFIG: BootstrapConfig = {
  mode: "auto",
  securityLevel: "high",
  retrainInterval: 12,
  enableTelemetry: true,
  enableAnomalyMonitor: true,
  activeModules: [
    "core.kernel",
    "core.cognition",
    "ai",
    "governance",
    "security",
    "modules.tindakan",
    "modules.pasien",
    "modules.dokter",
  ],
  logPolicy: "normal",
};

/**
 * Utilitas status konfigurasi.
 */
export function printBootstrapConfig() {
  console.log("🧠 [BOOT CONFIG]", {
    mode: IDIK_BOOT_CONFIG.mode,
    retrainInterval: IDIK_BOOT_CONFIG.retrainInterval,
    modules: IDIK_BOOT_CONFIG.activeModules.length,
    telemetry: IDIK_BOOT_CONFIG.enableTelemetry,
  });
}
