// services/tindakanService.ts
import { TindakanRepo } from "../repository/tindakanRepo";
import { Tindakan } from "../domain/tindakan";

export const TindakanService = {
  tambahTindakan(data: Tindakan) {
    TindakanRepo.add(data);
    console.log("[TindakanService] Added:", (data as any).nama ?? (data as any).id);
  },
  daftarTindakan() {
    return TindakanRepo.findAll();
  },
};
