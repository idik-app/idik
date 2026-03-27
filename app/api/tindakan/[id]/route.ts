import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Satu baris `tindakan` — untuk deep link Pemakaian (`?tindakanId=`).
 */
export async function GET(_req: Request, ctx: Params) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("tindakan")
    .select(
      "id, tanggal, dokter, ruangan, tindakan, pasien_id, no_rm, nama_pasien",
    )
    .eq("id", tindakanId)
    .maybeSingle();

  if (error) {
    console.error("[api/tindakan/[id]]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Kasus tindakan tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: data.id as string,
      tanggal: data.tanggal as string | null,
      dokter: data.dokter as string | null,
      ruangan: data.ruangan as string | null,
      tindakan: data.tindakan as string | null,
      pasien_id: data.pasien_id as string | null,
      no_rm: data.no_rm as string | null,
      nama_pasien: data.nama_pasien as string | null,
    },
  });
}
