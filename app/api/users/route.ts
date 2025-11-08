// app/api/users/route.ts (DI SERVER)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-";

export async function GET() {
  const supabase = createClient();

  // ✅ PERBAIKAN: Menggunakan nama tabel yang benar sesuai RLS Policy
  const TABLE_NAME = "doctor";

  // Mengambil semua data dari tabel 'doctor'
  const { data, error } = await supabase.from(TABLE_NAME).select("*");

  if (error) {
    console.error(`❌ SUPABASE ERROR DARI TABEL ${TABLE_NAME}:`, error.message);

    // Mengembalikan status 500 jika Supabase gagal
    return NextResponse.json(
      {
        message:
          "Gagal memuat data. Kemungkinan: RLS Policy, Nama Tabel, atau Koneksi.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  // ✅ SOLUSI TYPE SAFETY: Mengembalikan data asli. Jika null, kembalikan array kosong.
  const finalData = data || [];

  return NextResponse.json({ data: finalData });
}
