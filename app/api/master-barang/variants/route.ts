import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

type MbRow = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  kategori: string | null;
  barcode: string | null;
  distributor_id: string | null;
  satuan: string | null;
  is_active: boolean;
  harga_jual: number | null;
};

type DbRow = {
  id: string;
  lot: string | null;
  ukuran: string | null;
  ed: string | null;
  barcode: string | null;
  distributor_id: string;
  is_active: boolean | null;
  harga_jual: number | null;
};

function pickHarga(
  masterHarga: number | null | undefined,
  variantHarga: number | null | undefined,
): number | null {
  const v = variantHarga != null ? Number(variantHarga) : null;
  if (v != null && Number.isFinite(v)) return v;
  const m = masterHarga != null ? Number(masterHarga) : null;
  if (m != null && Number.isFinite(m)) return m;
  return null;
}

/** Cache master barang & variants di memori server (5 menit) */
let variantsCache: any[] | null = null;
let variantsCacheExpires = 0;

/**
 * Baris untuk pilih barang di pemakaian: gabungan master_barang +
 * variant distributor_barang (LOT / ukuran / ED bila ada).
 */
export async function GET() {
  const now = Date.now();
  if (variantsCache && now < variantsCacheExpires) {
    return NextResponse.json({ ok: true, items: variantsCache, cached: true });
  }

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

  const { data: masters, error: me } = await supabase
    .from("master_barang")
    .select(
      "id, kode, nama, jenis, kategori, barcode, distributor_id, satuan, is_active, harga_jual"
    )
    .order("nama", { ascending: true });

  if (me) {
    return NextResponse.json(
      { ok: false, message: me.message },
      { status: 500 }
    );
  }

  const activeMasters = (masters ?? []).filter((r) => {
    if ((r as MbRow).is_active === false) return false;
    return ((r as MbRow).nama ?? "").trim().length > 0;
  }) as MbRow[];

  const masterIds = activeMasters.map((m) => m.id);

  // PARALEL: Ambil detail variant dan distributor sekaligus
  const [dbResult, distResult] = await Promise.all([
    masterIds.length > 0
      ? supabase
          .from("distributor_barang")
          .select(
            "id, master_barang_id, lot, ukuran, ed, barcode, distributor_id, is_active, harga_jual"
          )
          .in("master_barang_id", masterIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("master_distributor").select("id, nama_pt, is_konsolidasi")
  ]);

  if (dbResult.error) {
    return NextResponse.json({ ok: false, message: dbResult.error.message }, { status: 500 });
  }

  const dbRows = dbResult.data;
  const distRows = distResult.data;

  const byMaster = new Map<string, DbRow[]>();
  for (const r of dbRows ?? []) {
    const mbId = String((r as { master_barang_id: string }).master_barang_id);
    if ((r as DbRow).is_active === false) continue;
    const list = byMaster.get(mbId) ?? [];
    list.push(r as DbRow);
    byMaster.set(mbId, list);
  }

  const distMap = new Map<string, { nama: string; is_konsolidasi: boolean }>();
  for (const d of distRows ?? []) {
    distMap.set(String((d as { id: string }).id), {
      nama: String((d as { nama_pt?: string }).nama_pt ?? "").trim(),
      is_konsolidasi: !!(d as any).is_konsolidasi,
    });
  }

  const items: {
    pickId: string;
    master_barang_id: string;
    distributor_barang_id: string | null;
    kode: string;
    nama: string;
    jenis: string;
    kategori: string | null;
    barcode: string | null;
    satuan: string | null;
    distributor_id: string | null;
    distributor_nama: string | null;
    is_konsolidasi: boolean;
    lot: string | null;
    ukuran: string | null;
    ed: string | null;
    harga_jual: number | null;
  }[] = [];

  for (const m of activeMasters) {
    const children = byMaster.get(m.id) ?? [];
    const distInfo = m.distributor_id
      ? distMap.get(String(m.distributor_id))
      : null;

    const masterHarga =
      m.harga_jual != null ? Number(m.harga_jual) : null;

    if (children.length === 0) {
      items.push({
        pickId: m.id,
        master_barang_id: m.id,
        distributor_barang_id: null,
        kode: m.kode ?? "",
        nama: m.nama ?? "",
        jenis: m.jenis ?? "",
        kategori: m.kategori ?? null,
        barcode: m.barcode ?? null,
        satuan: m.satuan ?? null,
        distributor_id: m.distributor_id ? String(m.distributor_id) : null,
        distributor_nama: distInfo?.nama ?? null,
        is_konsolidasi: distInfo?.is_konsolidasi ?? false,
        lot: null,
        ukuran: null,
        ed: null,
        harga_jual:
          masterHarga != null && Number.isFinite(masterHarga)
            ? masterHarga
            : null,
      });
      continue;
    }

    for (const db of children) {
      const did = String(db.distributor_id);
      const dInfo = distMap.get(did);
      const vHarga =
        db.harga_jual != null ? Number(db.harga_jual) : null;
      items.push({
        pickId: db.id,
        master_barang_id: m.id,
        distributor_barang_id: db.id,
        kode: m.kode ?? "",
        nama: m.nama ?? "",
        jenis: m.jenis ?? "",
        kategori: m.kategori ?? null,
        barcode: db.barcode?.trim() || m.barcode || null,
        satuan: m.satuan ?? null,
        distributor_id: did,
        distributor_nama: dInfo?.nama ?? null,
        is_konsolidasi: dInfo?.is_konsolidasi ?? false,
        lot: db.lot?.trim() || null,
        ukuran: db.ukuran?.trim() || null,
        ed: db.ed?.trim() || null,
        harga_jual: pickHarga(masterHarga, vHarga),
      });
    }
  }

  // Update Cache
  variantsCache = items;
  variantsCacheExpires = Date.now() + 300 * 1000; // 5 menit

  return NextResponse.json({ ok: true, items });
}
