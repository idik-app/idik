export interface Doctor {
  id: string;
  nama_dokter: string;
  spesialis: string;
  nomor_str: string;
  nomor_sip: string;
  kontak?: string;
  email?: string;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
}
