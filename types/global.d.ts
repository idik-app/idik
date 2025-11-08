/**
 * ============================================================
 * Cathlab IDIK-App – Global Type Declarations
 * Versi 3.1 Gold-Cyan Hybrid (JARVIS Mode)
 * ============================================================
 * Semua tipe utama (Doctor, Pasien, Tindakan, StatistikDashboard)
 * dapat diakses global tanpa import manual.
 * ============================================================
 */

declare global {
  // =====================
  // 🩺 Dokter
  // =====================
  interface Doctor {
    id: string;
    nama_dokter: string;
    spesialis: string;
    nomor_str?: string;
    nomor_sip?: string;
    kontak?: string;
    email?: string;
    status_aktif: boolean;
    created_at?: string;
    updated_at?: string;
  }

  interface DoctorContextType {
    doctors: Doctor[];
    loading: boolean;
    fetchDoctors: () => Promise<void>;
    addDoctor: (data: Partial<Doctor>) => Promise<void>;
    updateDoctor: (id: string, data: Partial<Doctor>) => Promise<void>;
    deleteDoctor: (id: string) => Promise<void>;
  }

  // =====================
  // 👤 Pasien
  // =====================
  interface Pasien {
    id: string;
    no_rm: string;
    nama_pasien: string;
    dokter_id?: string; // relasi → Doctor.id
    tindakan_id?: string; // relasi → Tindakan.id
    tanggal_mrs?: string; // yyyy-mm-dd
    tanggal_tindakan: string; // yyyy-mm-dd
    usia?: number;
    jenis_kelamin?: "L" | "P";
    status_rawat?: "Rawat Jalan" | "Rawat Inap" | "Cito";
    created_at?: string;
    updated_at?: string;
  }

  interface PasienContextType {
    pasienList: Pasien[];
    loading: boolean;
    fetchPasien: () => Promise<void>;
    addPasien: (data: Partial<Pasien>) => Promise<void>;
    updatePasien: (id: string, data: Partial<Pasien>) => Promise<void>;
    deletePasien: (id: string) => Promise<void>;
  }

  // =====================
  // ⚙️ Tindakan
  // =====================
  interface Tindakan {
    id: string;
    nama_tindakan: string;
    kategori_tindakan?: string;
    tarif?: number;
    durasi_menit?: number;
    keterangan?: string;
    created_at?: string;
    updated_at?: string;
  }

  interface TindakanContextType {
    tindakanList: Tindakan[];
    loading: boolean;
    fetchTindakan: () => Promise<void>;
    addTindakan: (data: Partial<Tindakan>) => Promise<void>;
    updateTindakan: (id: string, data: Partial<Tindakan>) => Promise<void>;
    deleteTindakan: (id: string) => Promise<void>;
  }

  // =====================
  // 📊 Statistik Dashboard
  // =====================
  interface StatistikDashboard {
    dokter_id: string;
    nama_dokter: string;
    total_pasien: number;
    jenis_tindakan: number;
    pertama_tindakan: string | null;
    terakhir_tindakan: string | null;
  }
}

export {};
