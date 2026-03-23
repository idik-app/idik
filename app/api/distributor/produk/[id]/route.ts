import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { parseDistributorBarangExtra } from "@/lib/distributorCatalog";
import { insertDistributorEvent } from "@/lib/distributorEventLog";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok)
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 },
    );
  }

  const mappingId = String(params.id);
  if (!mappingId)
    return NextResponse.json(
      { ok: false, message: "Invalid id" },
      { status: 400 },
    );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const { data: existing, error: exErr } = await supabase
    .from("distributor_barang")
    .select("id, distributor_id, master_barang_id")
    .eq("id", mappingId)
    .maybeSingle();

  if (exErr)
    return NextResponse.json(
      { ok: false, message: exErr.message },
      { status: 500 },
    );
  if (!existing)
    return NextResponse.json(
      { ok: false, message: "Mapping not found" },
      { status: 404 },
    );

  if (!idAuth.isAdminView) {
    if (String(existing.distributor_id) !== String(idAuth.distributorId)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 },
      );
    }
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body?.kode_distributor !== undefined)
    payload.kode_distributor = body.kode_distributor
      ? String(body.kode_distributor)
      : null;
  if (body?.harga_jual !== undefined)
    payload.harga_jual =
      body.harga_jual === null ? null : Number(body.harga_jual);
  if (body?.min_stok !== undefined)
    payload.min_stok = body.min_stok === null ? null : Number(body.min_stok);
  if (body?.is_active !== undefined)
    payload.is_active = Boolean(body.is_active);

  const catalog = parseDistributorBarangExtra(
    body as Record<string, unknown>,
    true,
  );
  if (!catalog.ok) {
    return NextResponse.json(
      { ok: false, message: catalog.message },
      { status: 400 },
    );
  }
  Object.assign(payload, catalog.value);

  const { data, error } = await supabase
    .from("distributor_barang")
    .update(payload as never)
    .eq("id", mappingId)
    .select(
      "id, distributor_id, master_barang_id, kode_distributor, harga_jual, min_stok, is_active, barcode, kategori, lot, ukuran, ed",
    );

  if (error)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );

  const updatedKeys = Object.keys(payload).filter((k) => k !== "updated_at");
  void insertDistributorEvent(supabase, {
    distributorId: String(existing.distributor_id),
    eventType: "PRODUCT_UPDATED",
    actor: idAuth.username,
    payload: {
      distributor_barang_id: mappingId,
      master_barang_id: existing.master_barang_id,
      updated_keys: updatedKeys,
    },
  });

  return NextResponse.json(
    { ok: true, data: data?.[0] ?? null },
    { status: 200 },
  );
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const via = new URL(req.url).searchParams.get("via");
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok)
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 },
    );
  }

  const mappingId = String(params.id);
  if (!mappingId)
    return NextResponse.json(
      { ok: false, message: "Invalid id" },
      { status: 400 },
    );

  let penerimaPetugas: string | null = null;
  let notaPengirimanBody: string | null = null;
  try {
    const raw = await req.text();
    if (raw) {
      const j = JSON.parse(raw) as {
        penerima_petugas?: string;
        nota_pengiriman?: string;
      };
      const v = j.penerima_petugas?.trim();
      penerimaPetugas = v ? v.slice(0, 200) : null;
      const np = j.nota_pengiriman?.trim();
      notaPengirimanBody = np ? np.slice(0, 120) : null;
    }
  } catch {
    /* body opsional */
  }

  const { data: fullRow, error: frErr } = await supabase
    .from("distributor_barang")
    .select("*")
    .eq("id", mappingId)
    .maybeSingle();

  if (frErr)
    return NextResponse.json(
      { ok: false, message: frErr.message },
      { status: 500 },
    );
  if (!fullRow)
    return NextResponse.json(
      { ok: false, message: "Mapping not found" },
      { status: 404 },
    );

  const existing = fullRow as { distributor_id: string; master_barang_id: string };

  if (!idAuth.isAdminView) {
    if (String(existing.distributor_id) !== String(idAuth.distributorId)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 },
      );
    }
  }

  const distributorId = String(existing.distributor_id);
  const masterBarangId = String(existing.master_barang_id);

  const { error } = await supabase
    .from("distributor_barang")
    .delete()
    .eq("id", mappingId);
  if (error)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );

  const { data: mbSnap } = await supabase
    .from("master_barang")
    .select("kode, nama")
    .eq("id", masterBarangId)
    .maybeSingle();

  const isRetur = via === "retur";
  const snapshot = { ...(fullRow as Record<string, unknown>) };

  let notaNomor: string | null = null;
  if (isRetur) {
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
    notaNomor = `${prefix}${String(seq).padStart(3, "0")}`;
  }

  void insertDistributorEvent(supabase, {
    distributorId,
    eventType: isRetur ? "KATALOG_RETUR" : "PRODUCT_DELETED",
    actor: idAuth.username,
    notaNomor,
    penerimaPetugas,
    returFisikStatus: isRetur ? "MENUNGGU_AMBIL" : null,
    notaPengiriman: isRetur ? notaPengirimanBody : null,
    payload: {
      distributor_barang_id: mappingId,
      master_barang_id: masterBarangId,
      master_kode: mbSnap?.kode ?? null,
      master_nama: mbSnap?.nama ?? null,
      ...(isRetur
        ? {
            alasan: "retur_distributor" as const,
            snapshot,
            stok_mutasi: [] as { inventaris_id: string; qty_delta: number }[],
            /** Duplikat kolom DB untuk jejak di payload (tampilan / export). */
            nota_nomor: notaNomor,
            penerima_petugas: penerimaPetugas,
            retur_fisik_status: "MENUNGGU_AMBIL" as const,
            nota_pengiriman: notaPengirimanBody,
          }
        : {}),
    },
  });

  return NextResponse.json(
    isRetur ? { ok: true, nota_nomor: notaNomor } : { ok: true },
    { status: 200 },
  );
}
