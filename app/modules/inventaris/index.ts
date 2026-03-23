// inventaris/index.ts
export interface Alkes {
  id: string;
  nama: string;
  lot: string;
  stok: number;
  status: "baru" | "reuse";
}
export const InventarisRepo: Alkes[] = [];
