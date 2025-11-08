export interface Pasien {
  id: string;
  noRM: string;
  nama: string;
  jenisKelamin: "L" | "P";
  tanggalLahir: string;
  alamat?: string;
  noHP?: string;
  jenisPembiayaan?: string;
  kelasPerawatan?: string;
  asuransi?: string;
  created_at?: string;
  updated_at?: string;
}
