import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { insertDistributorEvent } from "@/lib/distributorEventLog";

function scopeDistributorId(
  id: Awaited<ReturnType<typeof getDistributorIdentity>>,
  param: string,
) {
  if (!id.ok) return null;
  if (id.isAdminView) return param || null;
  return id.distributorId ?? null;
}

async function nextNotaNomor(
  supabase: ReturnType<typeof createAdminClient>,
  distributorId: string,
): Promise<string> {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `RT-${day}-`;
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const { count } = await supabase
    .from("distributor_event_log")
    .select("*", { count: "exact", head: true })
    .eq("distributor_id", distributorId)
    .eq("event_type", "KATALOG_RETUR")
    .gte("created_at", dayStart.toISOString())
    .lt("created_at", dayEnd.toISOString());
  const seq = (count ?? 0) + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/** POST: selesaikan retur untuk baris DRAFT / SIAP_RETUR terpilih (satu nota batch). */
export async function POST(req: Request) {
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok) {
    const status = idAuth.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  let body: {
    ids?: string[];
    distributor_id?: string;
    penerima_petugas?: string;
    nota_pengiriman?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON tidak valid" }, { status: 400 });
  }

  const distributorIdParam = String(body.distributor_id ?? "").trim();
  const scope = idAuth.isAdminView
    ? distributorIdParam || null
    : idAuth.distributorId ?? null;

  if (idAuth.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: set distributor_id di body." },
      { status: 400 },
    );
  }
  if (!scope) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, message: "ids wajib (array UUID)" },
      { status: 400 },
    );
  }

  const penerimaPetugas = body.penerima_petugas?.trim().slice(0, 200) || null;
  const notaPengirimanBody = body.nota_pengiriman?.trim().slice(0, 120) || null;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 },
    );
  }

  const { data: rows, error: fetchErr } = await supabase
    .from("distributor_retur_staging")
    .select("*")
    .in("id", ids);

  if (fetchErr) {
    return NextResponse.json({ ok: false, message: fetchErr.message }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length !== ids.length) {
    return NextResponse.json(
      { ok: false, message: "Beberapa ID tidak ditemukan." },
      { status: 400 },
    );
  }

  for (const r of list) {
    if (String((r as { distributor_id: string }).distributor_id) !== scope) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    const st = String((r as { status: string }).status);
    if (st !== "SIAP_RETUR" && st !== "DRAFT") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Hanya baris Draf atau Siap retur yang bisa diproses.",
        },
        { status: 400 },
      );
    }
  }

  const notaNomor = await nextNotaNomor(supabase, scope);
  const actor = idAuth.username;

  const lines: Record<string, unknown>[] = [];
  for (const r of list) {
    const stagingId = String((r as { id: string }).id);
    const dbid = String((r as { distributor_barang_id: string }).distributor_barang_id);

    const { data: fullRow } = await supabase
      .from("distributor_barang")
      .select("*")
      .eq("id", dbid)
      .maybeSingle();

    const { data: mbSnap } = await supabase
      .from("master_barang")
      .select("kode, nama")
      .eq("id", String((r as { master_barang_id: string }).master_barang_id))
      .maybeSingle();

    const snapshot = fullRow ? { ...(fullRow as Record<string, unknown>) } : {};
    lines.push({
      retur_staging_id: stagingId,
      distributor_barang_id: dbid,
      master_barang_id: (r as { master_barang_id: string }).master_barang_id,
      qty: (r as { qty: number }).qty,
      allocations: (r as { allocations: unknown }).allocations,
      snapshot,
      master_kode: mbSnap?.kode ?? null,
      master_nama: mbSnap?.nama ?? null,
    });

    const { error: upErr } = await supabase
      .from("distributor_retur_staging")
      .update({
        status: "SELESAI",
        nota_nomor: notaNomor,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", stagingId);

    if (upErr) {
      return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    }
  }

  void insertDistributorEvent(supabase, {
    distributorId: scope,
    eventType: "KATALOG_RETUR",
    actor,
    notaNomor,
    penerimaPetugas,
    returFisikStatus: "MENUNGGU_AMBIL",
    notaPengiriman: notaPengirimanBody,
    payload: {
      alasan: "retur_distributor_batch" as const,
      batch: true,
      nota_nomor: notaNomor,
      staging_ids: ids,
      lines,
      penerima_petugas: penerimaPetugas,
      retur_fisik_status: "MENUNGGU_AMBIL" as const,
      nota_pengiriman: notaPengirimanBody,
      stok_mutasi_rollups: lines.map((L) => ({
        retur_staging_id: L.retur_staging_id,
        allocations: L.allocations,
      })),
    },
  });

  return NextResponse.json(
    { ok: true, nota_nomor: notaNomor, count: lines.length },
    { status: 200 },
  );
}
