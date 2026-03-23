import { createLogger } from "@/core/utils/logger";

const logger = createLogger("DokterModule");

/**
 * 🧩 DokterModule – Data Dokter Cathlab
 * -------------------------------------
 * Menyimpan profil, spesialisasi, dan jadwal dokter.
 */
export const DokterModule = {
  id: "dokter",
  label: "Data Dokter",
  version: "4.0",
  status: "active",
  initConnection: async () => {
    try {
      logger.info("DokterModule initialized");
      return "ok";
    } catch (err) {
      logger.error(err);
      return "error";
    }
  },
};

export default DokterModule;
