// pasien/index.ts
export interface Pasien {
  id: string;
  nama: string;
  umur: number;
  diagnosis?: string;
}
export const PasienRepo: Pasien[] = [];
