import { createLogger } from "@/core/utils/logger";
const logger = createLogger("DokterModule");

export const DokterModule = {
  id: "dokter",
  label: "Data Dokter",
  version: "4.0",
  status: "active",
  initConnection: async () => {
    try {
      logger.info("DokterModule initialized");
      return "ok";
    } catch (e) {
      logger.error(e);
      return "error";
    }
  },
};

export default DokterModule;
