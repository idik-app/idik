import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

export const dynamic = "force-dynamic";

/*───────────────────────────────────────────────
 📡 GET /api/pasien
 - Daftar pasien untuk dashboard (sama pola dengan GET /api/doctors)
 - Baca lewat service role agar konsisten dengan insert (admin) & tidak
   terblokir RLS saat client anon tidak punya policy SELECT ke public.pasien.
───────────────────────────────────────────────*/
export async function GET() {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("pasien")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Gagal mengambil data pasien" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ Gagal mengambil pasien:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server saat mengambil pasien" },
      { status: 500 }
    );
  }
}

