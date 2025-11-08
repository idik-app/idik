// 💾 D:\idik-app\lib\database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Doctor {
  id: string; // uuid
  created_at: string; // timestampz
  nama_dokter: string | null;
  spesialis: string | null;
  nomor_str: string | null;
  nomor_sip: string | null;
  kontak: string | null;
  email: string | null;
  status: boolean;
}

// Skema Database Utama
export interface Database {
  public: {
    Tables: {
      // ✅ Hanya definisikan tabel yang sudah pasti
      doctor: {
        Row: Doctor;
        Insert: Omit<Doctor, "id" | "created_at">;
        Update: Partial<Omit<Doctor, "id" | "created_at">>;
      };
      [key: string]: {};
    };
    Views: {
      [key: string]: { Row: Record<string, unknown> };
    };
    Functions: {
      [key: string]: { Args: Record<string, unknown>; Returns: unknown };
    };
    // ... (Enums dan CompositeTypes jika ada)
  };
}
