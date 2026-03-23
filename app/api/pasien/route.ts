"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-";

/*───────────────────────────────────────────────
 📡 GET /api/pasien
 - Ambil seluruh data pasien
 - Tangani error server-side
───────────────────────────────────────────────*/
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pasien" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Gagal mengambil data pasien" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Gagal mengambil pasien:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server saat mengambil pasien" },
      { status: 500 }
    );
  }
}

