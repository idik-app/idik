/**
 * 🧠 IDIKModuleRegistry – Cathlab JARVIS Mode v5.0
 * -------------------------------------------------
 * Mengelola pendaftaran, inisialisasi, dan status setiap modul otonom.
 */

import { createLogger } from "@/core/utils/logger";
import { AdaptiveGovernor } from "@/core/ai-engine/AdaptiveGovernor";

/* ────────────────────────────────────────────────
   🔗 Impor modul-modul IDIK-App
──────────────────────────────────────────────── */
import { PasienModule } from "@/modules/pasien/pasien.module.config";
import { DokterModule } from "@/modules/dokter/dokter.module.config";
import { InventarisModule } from "@/modules/inventaris/inventaris.module.config";
import { TindakanModule } from "@/modules/tindakan/tindakan.module.config";

const logger = createLogger("ModuleRegistry");

export interface IDIKModule {
  id: string;
  label: string;
  version: string;
  status: "active" | "inactive" | "error" | string;
  initConnection?: () => Promise<string | void>;
}

class ModuleRegistry {
  private modules: Map<string, IDIKModule> = new Map();

  register(module: IDIKModule) {
    if (!module.id) return;
    this.modules.set(module.id, module);
    logger.info(`Modul terdaftar: ${module.label} (${module.id})`);
  }

  async initializeAll() {
    logger.info("Inisialisasi semua modul IDIK-App...");
    const results: string[] = [];

    for (const module of this.modules.values()) {
      try {
        if (module.initConnection) {
          const res = await module.initConnection();
          results.push(`${module.label}: ${res}`);
        } else {
          results.push(`${module.label}: no initConnection`);
        }
      } catch (err) {
        logger.error(`Gagal inisialisasi ${module.label}:`, err);
      }
    }

    AdaptiveGovernor.start();
    logger.info("Semua modul diinisialisasi");
    logger.info("Hasil:", results.join(" | "));
  }

  listModules() {
    return Array.from(this.modules.values());
  }

  getModule(id: string) {
    return this.modules.get(id);
  }
}

export const IDIKModuleRegistry = new ModuleRegistry();

/* Register all modules here */
IDIKModuleRegistry.register(PasienModule);
IDIKModuleRegistry.register(DokterModule);
IDIKModuleRegistry.register(InventarisModule);
IDIKModuleRegistry.register(TindakanModule);

export default IDIKModuleRegistry;
