import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

/** GET: ringkasan angka untuk panel riwayat (menetap). */
export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    const status = id.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const scope = id.isAdminView
    ? distributorIdParam || null
    : id.distributorId ?? null;

  if (id.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: isi distributor_id." },
      { status: 400 },
    );
  }
  if (!scope) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }

  const base = () =>
    supabase
      .from("distributor_event_log")
      .select("*", { count: "exact", head: true })
      .eq("distributor_id", scope);

  const [all, retur, batal] = await Promise.all([
    base(),
    base().eq("event_type", "KATALOG_RETUR"),
    base().eq("event_type", "RETUR_DIBATALKAN"),
  ]);

  const total = all.count ?? 0;
  const returCount = retur.count ?? 0;
  const batalCount = batal.count ?? 0;
  const returAktifApprox = Math.max(0, returCount - batalCount);

  return NextResponse.json(
    {
      ok: true,
      data: {
        total_peristiwa: total,
        retur_katalog: returCount,
        batal_retur: batalCount,
        retur_belum_dibatalkan_kira: returAktifApprox,
      },
    },
    { status: 200 },
  );
}
