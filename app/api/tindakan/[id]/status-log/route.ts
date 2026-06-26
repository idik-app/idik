import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Params) {
  const { requireRole } = await import("@/lib/auth/guards");
  const auth = await requireRole([
    "perawat",
    "dokter",
    "admin",
    "administrator",
    "superadmin",
    "casemix",
  ]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = String(id ?? "").trim();
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
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
    .from("tindakan_status_log")
    .select("id, tindakan_id, status, status_keterangan, changed_by, created_at")
    .eq("tindakan_id", tindakanId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    const missing = /could not find the table|relation.*does not exist/i.test(
      String(error.message ?? ""),
    );
    if (missing) {
      return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
}
