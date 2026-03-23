import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { applyReturFifo, reverseReturAllocations } from "@/lib/returStagingFifo";
import { insertDistributorEvent } from "@/lib/distributorEventLog";

/** GET: daftar baris retur staging. */
export async function GET(req: Request) {
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok) {
    const status = idAuth.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 },
    );
  }

  let listQuery = supabase
    .from("distributor_retur_staging")
    .select(
      "id, created_at, updated_at, distributor_id, distributor_barang_id, master_barang_id, qty, status, allocations, actor, nota_nomor",
    );

  if (idAuth.isAdminView) {
    if (distributorIdParam) {
      listQuery = listQuery.eq("distributor_id", distributorIdParam);
    }
    /* Admin tanpa query: tampilkan semua baris staging (filter opsional lewat distributor_id). */
  } else {
    const scope = idAuth.distributorId ?? null;
    if (!scope) {
      return NextResponse.json(
        { ok: false, message: "distributor tidak dikenal" },
        { status: 400 },
      );
    }
    listQuery = listQuery.eq("distributor_id", scope);
  }

  const { data: rows, error } = await listQuery.order("created_at", {
    ascending: false,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const rowList = rows ?? [];
  const masterIds = [
    ...new Set(rowList.map((r: { master_barang_id: string }) => r.master_barang_id)),
  ];
  const mbMap = new Map<string, { kode: string; nama: string }>();
  if (masterIds.length > 0) {
    const { data: mbRows } = await supabase
      .from("master_barang")
      .select("id, kode, nama")
      .in("id", masterIds);
    for (const m of mbRows ?? []) {
      mbMap.set(String((m as { id: string }).id), {
        kode: String((m as { kode: string }).kode ?? ""),
        nama: String((m as { nama: string }).nama ?? ""),
      });
    }
  }

  const mappingIds = [
    ...new Set(
      rowList.map((r: { distributor_barang_id: string }) => r.distributor_barang_id),
    ),
  ];
  const dbMap = new Map<string, Record<string, unknown>>();
  if (mappingIds.length > 0) {
    const { data: dbRows } = await supabase
      .from("distributor_barang")
      .select("id, kode_distributor, lot, ukuran, ed")
      .in("id", mappingIds);
    for (const d of dbRows ?? []) {
      dbMap.set(String((d as { id: string }).id), d as Record<string, unknown>);
    }
  }

  const enriched = rowList.map((r: Record<string, unknown>) => {
    const dbid = String(r.distributor_barang_id);
    const mb = mbMap.get(String(r.master_barang_id));
    return {
      ...r,
      master_barang: mb ?? null,
      distributor_barang: dbMap.get(dbid) ?? null,
    };
  });

  return NextResponse.json({ ok: true, data: enriched }, { status: 200 });
}

/** POST: tambah baris — kurangi stok FIFO, masuk panel (DRAFT). */
export async function POST(req: Request) {
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok) {
    const status = idAuth.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  let body: { distributor_barang_id?: string; qty?: number; distributor_id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON tidak valid" }, { status: 400 });
  }

  const mappingId = String(body.distributor_barang_id ?? "").trim();
  const qty = Number(body.qty);
  if (!mappingId) {
    return NextResponse.json(
      { ok: false, message: "distributor_barang_id wajib" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json(
      { ok: false, message: "qty harus angka > 0" },
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

  const masterBarangId = String(mapRow.master_barang_id);
  const actor = idAuth.username;

  let allocations: { inventaris_id: string; mutasi_id: string; qty: number }[] = [];
  try {
    const res = await applyReturFifo(supabase, {
      masterBarangId,
      distributorId: scope,
      qty,
      actor,
      keterangan: "Retur staging — keluarkan dari Cathlab (FIFO)",
    });
    allocations = res.allocations;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mengurangi stok";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("distributor_retur_staging")
    .insert({
      distributor_id: scope,
      distributor_barang_id: mappingId,
      master_barang_id: masterBarangId,
      qty,
      status: "DRAFT",
      allocations,
      actor,
    } as never)
    .select("id")
    .maybeSingle();

  if (insErr || !inserted) {
    try {
      await reverseReturAllocations(supabase, allocations, actor);
    } catch {
      /* best effort */
    }
    return NextResponse.json(
      { ok: false, message: insErr?.message ?? "Gagal menyimpan staging" },
      { status: 500 },
    );
  }

  void insertDistributorEvent(supabase, {
    distributorId: scope,
    eventType: "MUTASI_STOK",
    actor,
    payload: {
      retur_staging_id: (inserted as { id: string }).id,
      distributor_barang_id: mappingId,
      master_barang_id: masterBarangId,
      qty,
      allocations,
      note: "retur_staging_dibuat",
    },
  });

  return NextResponse.json(
    { ok: true, id: (inserted as { id: string }).id },
    { status: 200 },
  );
}
