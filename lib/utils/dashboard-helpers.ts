// 💾 D:\idik-app\lib\utils\dashboard-helpers.ts

// Tipe data mentah (hasil query Supabase)
export type RawData = {
  id?: string | number;
  doctor_id?: string | number;
  procedure?: string;
  [key: string]: any;
};

// Struktur hasil statistik
export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalProcedures: number;
}

// Fungsi helper untuk menghitung ringkasan dari data mentah
export function calculateDashboardStats(data: RawData[]): DashboardStats {
  const totalPatients = data.length;

  // Hitung dokter unik
  const totalDoctors = new Set(
    data.map((d) => d.doctor_id).filter((id) => id !== null && id !== undefined)
  ).size;

  // Hitung baris yang memiliki kolom 'procedure'
  const totalProcedures = data.filter((d) => !!d.procedure).length;

  return { totalPatients, totalDoctors, totalProcedures };
}
