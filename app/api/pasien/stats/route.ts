import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

export const dynamic = "force-dynamic";

async function countBy(
  supabase: ReturnType<typeof getServiceSupabaseAdmin>,
  build: (q: any) => any
) {
  const q = build(supabase.from("pasien").select("id", { count: "exact", head: true }));
  const { count, error } = await q;
  if (error) throw new Error(error.message ?? "Gagal menghitung data pasien");
  return count ?? 0;
}

/*───────────────────────────────────────────────
 📡 GET /api/pasien/stats
 - Statistik ringan untuk toolbar (tanpa fetch list pasien)
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

    const [total, laki, perempuan, bpjs, umum, asuransi] = await Promise.all([
      countBy(supabase, (q) => q),
      countBy(supabase, (q) => q.eq("jk", "L")),
      countBy(supabase, (q) => q.eq("jk", "P")),
      // Catatan: proyek ini treat BPJS termasuk NPBI (lihat `usePasienStats`)
      countBy(supabase, (q) => q.in("pembiayaan", ["BPJS", "NPBI"])),
      countBy(supabase, (q) => q.eq("pembiayaan", "Umum")),
      countBy(supabase, (q) => q.eq("pembiayaan", "Asuransi")),
    ]);

    return NextResponse.json(
      { ok: true, total, laki, perempuan, bpjs, umum, asuransi },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    console.error("❌ Gagal ambil pasien stats:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

