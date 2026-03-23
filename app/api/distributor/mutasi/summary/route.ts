import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return value;
}

/** GET: agregat qty mutasi Cathlab per distributor dalam rentang tanggal (created_at). */
export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    const status = id.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(req.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const distributorId = id.isAdminView
    ? distributorIdParam || null
    : id.distributorId ?? null;

  if (id.isAdminView && !distributorId) {
    return NextResponse.json(
      { ok: false, message: "Admin: isi distributor_id." },
      { status: 400 },
    );
  }
  if (!distributorId) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }
  if (!from || !to) {
    return NextResponse.json(
      { ok: false, message: "Parameter wajib: from, to (YYYY-MM-DD)" },
      { status: 400 },
    );
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

  const invRes = await supabase
    .from("inventaris")
    .select("id")
    .eq("lokasi", "Cathlab")
    .eq("distributor_id", distributorId);

  if (invRes.error) {
    return NextResponse.json(
      { ok: false, message: invRes.error.message },
      { status: 500 },
    );
  }

  const invIds = (invRes.data ?? []).map((r: { id: string }) => String(r.id));
  if (invIds.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        data: {
          from,
          to,
          qty_masuk: 0,
          qty_keluar_retur_rusak: 0,
          qty_keluar_pemakaian_mutasi: 0,
          qty_koreksi_net: 0,
        },
      },
      { status: 200 },
    );
  }

  const startIso = `${from}T00:00:00.000Z`;
  const endIso = `${to}T23:59:59.999Z`;

  const { data: rows, error } = await supabase
    .from("inventaris_stok_mutasi")
    .select("tipe, qty_delta")
    .in("inventaris_id", invIds)
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  let qty_masuk = 0;
  let qty_keluar_retur_rusak = 0;
  let qty_keluar_pemakaian_mutasi = 0;
  let qty_koreksi_net = 0;

  for (const r of rows ?? []) {
    const tipe = String((r as { tipe: string }).tipe);
    const q = Number((r as { qty_delta: number }).qty_delta ?? 0);
    if (!Number.isFinite(q)) continue;

    switch (tipe) {
      case "MASUK":
        qty_masuk += q;
        break;
      case "KELUAR_RETUR":
      case "KELUAR_RUSAK":
        qty_keluar_retur_rusak += Math.abs(q);
        break;
      case "KELUAR_PEMAKAIAN":
        qty_keluar_pemakaian_mutasi += Math.abs(q);
        break;
      case "KOREKSI":
        qty_koreksi_net += q;
        break;
      default:
        break;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        from,
        to,
        qty_masuk,
        qty_keluar_retur_rusak,
        qty_keluar_pemakaian_mutasi,
        qty_koreksi_net,
      },
    },
    { status: 200 },
  );
}
