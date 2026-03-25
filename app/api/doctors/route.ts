import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

/** Daftar dokter aktif untuk form pemakaian / pemilihan operator (master `doctor`). */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + service role).",
      },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("doctor")
    .select("id, nama_dokter, spesialis, status")
    .order("nama_dokter", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []).filter((r) => {
    const nama = (r.nama_dokter ?? "").trim();
    if (!nama) return false;
    if (r.status === false) return false;
    return true;
  });

  return NextResponse.json({
    ok: true,
    doctors: rows.map((r) => ({
      id: r.id,
      nama_dokter: r.nama_dokter ?? "",
      spesialis: r.spesialis ?? null,
    })),
  });
}
