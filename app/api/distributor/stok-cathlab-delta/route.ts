import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { applyCathlabStokDelta } from "@/lib/stokCathlabDelta";
import { insertDistributorEvent } from "@/lib/distributorEventLog";

/** POST: penyesuaian stok Cathlab (+/−) dari form edit distributor. */
export async function POST(req: Request) {
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok) {
    const status = idAuth.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  let body: {
    distributor_barang_id?: string;
    delta?: number;
    distributor_id?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON tidak valid" }, { status: 400 });
  }

  const mappingId = String(body.distributor_barang_id ?? "").trim();
  const delta = Number(body.delta);
  if (!mappingId) {
    return NextResponse.json(
      { ok: false, message: "distributor_barang_id wajib" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json(
      { ok: false, message: "delta harus angka dan tidak boleh 0" },
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

  const distributorIdParam = String(body.distributor_id ?? "").trim();

  const { data: mapRow, error: mapErr } = await supabase
    .from("distributor_barang")
    .select("id, distributor_id, master_barang_id")
    .eq("id", mappingId)
    .maybeSingle();

  if (mapErr) {
    return NextResponse.json({ ok: false, message: mapErr.message }, { status: 500 });
  }
  if (!mapRow) {
    return NextResponse.json(
      { ok: false, message: "Mapping tidak ditemukan" },
      { status: 404 },
    );
  }

  const mappingDistributorId = String(mapRow.distributor_id);
  let scope: string | null = idAuth.isAdminView
    ? distributorIdParam || mappingDistributorId
    : idAuth.distributorId ?? null;

  if (!idAuth.isAdminView && scope !== mappingDistributorId) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403 },
    );
  }
  if (idAuth.isAdminView && distributorIdParam && distributorIdParam !== mappingDistributorId) {
    return NextResponse.json(
      { ok: false, message: "distributor_id tidak cocok dengan produk ini" },
      { status: 400 },
    );
  }
  if (!scope) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }

  const actor = idAuth.username;
  const masterBarangId = String(mapRow.master_barang_id);

  try {
    await applyCathlabStokDelta(supabase, {
      masterBarangId,
      distributorId: scope,
      delta,
      actor,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyesuaikan stok";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }

  void insertDistributorEvent(supabase, {
    distributorId: scope,
    eventType: "MUTASI_STOK",
    actor,
    payload: {
      distributor_barang_id: mappingId,
      master_barang_id: masterBarangId,
      delta,
      note: "penyesuaian_stok_cathlab_form_edit",
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
