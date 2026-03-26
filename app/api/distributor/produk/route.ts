import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import {
  normalizeDistributorLotAutoValue,
  parseDistributorBarangExtra,
} from "@/lib/distributorCatalog";
import { findDistributorBarangLotConflict } from "@/lib/distributorBarangLotDup";
import { generateDefaultMasterKode } from "@/lib/masterBarangKode";
import { insertDistributorEvent } from "@/lib/distributorEventLog";
import { setCathlabStokToTarget } from "@/lib/stokCathlabDelta";

function parseOptionalDistributorId(
  req: Request,
  id: Awaited<ReturnType<typeof getDistributorIdentity>>,
) {
  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  if (!id.isAdminView) return id.distributorId ?? null;
  return distributorIdParam || null;
}

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok)
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

  const targetDistributorId = parseOptionalDistributorId(req, id);

  // 1) distributor_barang
  let mappingQuery = supabase
    .from("distributor_barang")
    .select(
      "id, distributor_id, master_barang_id, kode_distributor, harga_jual, min_stok, is_active, barcode, kategori, lot, ukuran, ed, created_at, updated_at",
    );

  if (targetDistributorId)
    mappingQuery = mappingQuery.eq("distributor_id", targetDistributorId);

  const { data: mappings, error: mapErr } = await mappingQuery.order(
    "updated_at",
    { ascending: false },
  );
  if (mapErr)
    return NextResponse.json(
      { ok: false, message: mapErr.message },
      { status: 500 },
    );

  const masterIds = (mappings ?? []).map((m: any) => m.master_barang_id);
  if (masterIds.length === 0)
    return NextResponse.json({ ok: true, data: [] }, { status: 200 });

  // 2) master_barang
  const { data: masterRows, error: masterErr } = await supabase
    .from("master_barang")
    .select("id, kode, nama, kategori, satuan, jenis")
    .in("id", masterIds);
  if (masterErr)
    return NextResponse.json(
      { ok: false, message: masterErr.message },
      { status: 500 },
    );

  const masterMap = new Map<string, any>();
  for (const r of masterRows ?? []) masterMap.set(r.id, r);

  /** Admin + tanpa filter distributor_id: beberapa PT bisa pakai master yang sama — stok per (pt, master). */
  const aggregateInventarisByPair =
    Boolean(id.isAdminView && !targetDistributorId);

  // 3) inventaris Cathlab — agregasi per master saat satu PT; per (distributor_id, master) saat admin lihat semua PT
  let invQ = supabase
    .from("inventaris")
    .select("id, nama, master_barang_id, stok, distributor_id")
    .eq("lokasi", "Cathlab")
    .in("master_barang_id", masterIds);

  if (!id.isAdminView && id.distributorId)
    invQ = invQ.eq("distributor_id", id.distributorId);
  if (id.isAdminView && targetDistributorId)
    invQ = invQ.eq("distributor_id", targetDistributorId);

  const { data: invRows, error: invErr } = await invQ;
  if (invErr)
    return NextResponse.json(
      { ok: false, message: invErr.message },
      { status: 500 },
    );

  const invStock = new Map<string, number>();
  const invLinesByKey = new Map<
    string,
    { id: string; nama: string | null; stok: number }[]
  >();

  function inventarisAggKey(
    masterBarangId: string,
    distributorIdRow: string,
  ): string {
    if (!aggregateInventarisByPair) return masterBarangId;
    return `${distributorIdRow}::${masterBarangId}`;
  }

  for (const r of invRows ?? []) {
    const mb = String(r.master_barang_id);
    const distRow = String((r as { distributor_id?: unknown }).distributor_id ?? "");
    const key = inventarisAggKey(mb, distRow);
    const prev = invStock.get(key) ?? 0;
    invStock.set(key, prev + Number(r.stok ?? 0));
    const line = {
      id: String((r as any).id),
      nama: ((r as any).nama as string | null) ?? null,
      stok: Number((r as any).stok ?? 0),
    };
    const list = invLinesByKey.get(key) ?? [];
    list.push(line);
    invLinesByKey.set(key, list);
  }

  const distNameMap = new Map<string, string>();
  if (id.isAdminView) {
    const distIds = [
      ...new Set(
        (mappings ?? [])
          .map((m: { distributor_id?: unknown }) =>
            String(m.distributor_id ?? "").trim(),
          )
          .filter(Boolean),
      ),
    ];
    if (distIds.length > 0) {
      const { data: distRows, error: distErr } = await supabase
        .from("master_distributor")
        .select("id, nama_pt")
        .in("id", distIds);
      if (!distErr) {
        for (const d of distRows ?? []) {
          distNameMap.set(String((d as { id: string }).id), String((d as { nama_pt?: string | null }).nama_pt ?? "").trim());
        }
      }
    }
  }

  const enriched = (mappings ?? []).map((m: any) => {
    const master = masterMap.get(String(m.master_barang_id)) ?? null;
    const mb = String(m.master_barang_id);
    const dist = String(m.distributor_id ?? "").trim();
    const stockKey = aggregateInventarisByPair
      ? inventarisAggKey(mb, dist)
      : mb;
    return {
      ...m,
      master_barang: master,
      stok_cathlab: invStock.get(stockKey) ?? 0,
      inventaris_lines: invLinesByKey.get(stockKey) ?? [],
      ...(id.isAdminView
        ? {
            distributor_nama_pt:
              dist && distNameMap.has(dist)
                ? distNameMap.get(dist) || null
                : null,
          }
        : {}),
    };
  });

  return NextResponse.json({ ok: true, data: enriched }, { status: 200 });
}

export async function POST(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok)
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const distributorId = id.isAdminView
    ? String(
        body?.distributor_id ??
          new URL(req.url).searchParams.get("distributor_id") ??
          "",
      ).trim()
    : id.distributorId!;

  if (!distributorId)
    return NextResponse.json(
      { ok: false, message: "distributor_id wajib" },
      { status: 400 },
    );

  const catalog = parseDistributorBarangExtra(
    body as Record<string, unknown>,
    false,
  );
  if (!catalog.ok) {
    return NextResponse.json(
      { ok: false, message: catalog.message },
      { status: 400 },
    );
  }

  let resolvedMasterId = String(body?.master_barang_id ?? "").trim();
  if (!resolvedMasterId) {
    const namaBaru = String(body?.nama_master_baru ?? "").trim();
    if (!namaBaru) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Pilih master dari daftar atau isi nama untuk barang master baru.",
        },
        { status: 400 },
      );
    }
    const kodeRaw = String(body?.kode_master_baru ?? "").trim();
    const jenis = body?.jenis_master === "OBAT" ? "OBAT" : "ALKES";
    let kode = kodeRaw || generateDefaultMasterKode(namaBaru);
    const barcodeMaster =
      catalog.value.barcode != null &&
      String(catalog.value.barcode).trim() !== ""
        ? String(catalog.value.barcode).trim()
        : null;

    let inserted: { id: string } | null = null;
    let insertErr: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await supabase
        .from("master_barang")
        .insert({
          kode,
          nama: namaBaru,
          jenis,
          satuan: "pcs",
          distributor_id: distributorId,
          barcode: barcodeMaster,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      inserted = res.data as { id: string } | null;
      insertErr = res.error;
      if (!insertErr) break;
      const dup =
        (insertErr as { code?: string }).code === "23505" ||
        String(insertErr.message).toLowerCase().includes("unique");
      if (kodeRaw || !dup) break;
      kode = generateDefaultMasterKode(namaBaru);
    }

    if (insertErr) {
      return NextResponse.json(
        { ok: false, message: insertErr.message },
        { status: 500 },
      );
    }
    resolvedMasterId = String(inserted?.id ?? "");
    if (!resolvedMasterId) {
      return NextResponse.json(
        { ok: false, message: "Gagal membuat master barang." },
        { status: 500 },
      );
    }
  }

  const kodeDistributor = body?.kode_distributor
    ? String(body.kode_distributor)
    : null;
  const hargaJual =
    body?.harga_jual === undefined || body?.harga_jual === null
      ? null
      : Number(body.harga_jual);
  const minStok =
    body?.min_stok === undefined || body?.min_stok === null
      ? 0
      : Number(body.min_stok);
  const isActive =
    body?.is_active === undefined || body?.is_active === null
      ? true
      : Boolean(body.is_active);

  const lotValPost = catalog.value.lot;
  const lotNormPost =
    lotValPost != null && String(lotValPost).trim() !== ""
      ? normalizeDistributorLotAutoValue(String(lotValPost))
      : "";
  if (lotNormPost) {
    try {
      const conflict = await findDistributorBarangLotConflict(supabase, {
        distributorId,
        normalizedLot: lotNormPost,
        allowMasterBarangId: resolvedMasterId,
      });
      if (conflict) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Nomor LOT sudah dipakai untuk produk lain di katalog distributor ini. Ubah LOT atau edit entri yang sudah ada.",
            conflict_distributor_barang_id: conflict.id,
          },
          { status: 409 },
        );
      }
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          message: e instanceof Error ? e.message : "Gagal memvalidasi LOT",
        },
        { status: 500 },
      );
    }
  }

  // Insert or update (upsert by unique constraint distributor_id+master_barang_id)
  const payload: Record<string, unknown> = {
    distributor_id: distributorId,
    master_barang_id: resolvedMasterId,
    kode_distributor: kodeDistributor,
    harga_jual: hargaJual,
    min_stok: minStok,
    is_active: isActive,
    updated_at: new Date().toISOString(),
    ...catalog.value,
  };

  const { data, error } = await supabase
    .from("distributor_barang")
    .upsert(payload as never, { onConflict: "distributor_id,master_barang_id" })
    .select(
      "id, distributor_id, master_barang_id, kode_distributor, harga_jual, min_stok, is_active, barcode, kategori, lot, ukuran, ed",
    );

  if (error)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );

  const row = data?.[0] as Record<string, unknown> | undefined;
  if (row?.id) {
    void insertDistributorEvent(supabase, {
      distributorId,
      eventType: "PRODUCT_UPSERT",
      actor: id.username,
      payload: {
        distributor_barang_id: row.id,
        master_barang_id: row.master_barang_id,
        kode_distributor: row.kode_distributor ?? null,
      },
    });
  }

  if (
    row &&
    body?.stok_cathlab !== undefined &&
    body?.stok_cathlab !== null
  ) {
    const target = Math.max(0, Math.round(Number(body.stok_cathlab)));
    if (!Number.isFinite(target)) {
      return NextResponse.json(
        { ok: false, message: "stok_cathlab harus angka bulat ≥ 0" },
        { status: 400 },
      );
    }
    try {
      await setCathlabStokToTarget(supabase, {
        masterBarangId: resolvedMasterId,
        distributorId,
        target,
        actor: id.username,
        keterangan: "Set stok Cathlab dari form tambah produk distributor",
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Gagal mengatur stok Cathlab";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }
    void insertDistributorEvent(supabase, {
      distributorId,
      eventType: "MUTASI_STOK",
      actor: id.username,
      payload: {
        distributor_barang_id: row.id,
        master_barang_id: resolvedMasterId,
        stok_cathlab_target: target,
        note: "set_stok_form_tambah_produk",
      },
    });
  }

  return NextResponse.json(
    { ok: true, data: data?.[0] ?? payload },
    { status: 200 },
  );
}
