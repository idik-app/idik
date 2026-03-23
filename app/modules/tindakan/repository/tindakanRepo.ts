// repository/tindakanRepo.ts
import { Tindakan } from "../domain/tindakan";

const tindakanDB: Tindakan[] = [];

export const TindakanRepo = {
  findAll: () => tindakanDB,
  add: (data: Tindakan) => tindakanDB.push(data),
  findByPasien: (id: string) =>
    tindakanDB.filter((t) => (t as any).pasienId === id),
};
