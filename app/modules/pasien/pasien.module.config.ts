import { createLogger } from "@/core/utils/logger";

const logger = createLogger("PasienModule");

/**
 * 🧩 PasienModule – Manajemen Data Pasien
 * ---------------------------------------
 * Modul dasar untuk data pasien, sinkronisasi Supabase, dan rekap.
 */
export const PasienModule = {
  id: "pasien",
  label: "Data Pasien",
  version: "4.0",
  status: "active",
  initConnection: async () => {
    try {
      logger.info("PasienModule initialized");
      return "ok";
    } catch (err) {
      logger.error(err);
      return "error";
    }
  },
};

export default PasienModule;
