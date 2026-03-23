import { createLogger } from "@/core/utils/logger";
import * as TindakanData from "./data/tindakanQueries";

const logger = createLogger("TindakanModule");

/**
 * 🧩 TindakanModule – Pencatatan Tindakan Medis Cathlab
 * -----------------------------------------------------
 * Mengelola data tindakan pasien, realtime sync, dan audit.
 */
export const TindakanModule = {
  id: "tindakan",
  label: "Tindakan Medis",
  version: "4.0",
  status: "active",
  initConnection: async () => {
    try {
      await TindakanData.getAllTindakan();
      logger.info("Supabase OK");
      return "ok";
    } catch (err) {
      logger.error(err);
      return "error";
    }
  },
};

export default TindakanModule;
