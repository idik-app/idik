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
};

type DbRow = {
  id: string;
  lot: string | null;
  ukuran: string | null;
  ed: string | null;
  barcode: string | null;
  distributor_id: string;
  is_active: boolean | null;
};

/**
 * Baris untuk pilih barang di pemakaian: gabungan master_barang +
 * variant distributor_barang (LOT / ukuran / ED bila ada).
 */
export async function GET() {
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
      "id, kode, nama, jenis, kategori, barcode, distributor_id, satuan, is_active"
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

  const { data: dbRows, error: dbe } =
    masterIds.length > 0
      ? await supabase
          .from("distributor_barang")
          .select(
            "id, master_barang_id, lot, ukuran, ed, barcode, distributor_id, is_active"
          )
          .in("master_barang_id", masterIds)
      : { data: [], error: null };

  if (dbe) {
    return NextResponse.json(
      { ok: false, message: dbe.message },
      { status: 500 }
    );
  }

  const byMaster = new Map<string, DbRow[]>();
  for (const r of dbRows ?? []) {
    const mbId = String((r as { master_barang_id: string }).master_barang_id);
    if ((r as DbRow).is_active === false) continue;
    const list = byMaster.get(mbId) ?? [];
    list.push(r as DbRow);
    byMaster.set(mbId, list);
  }

  const distIds = new Set<string>();
  for (const m of activeMasters) {
    if (m.distributor_id) distIds.add(String(m.distributor_id));
  }
  for (const row of dbRows ?? []) {
    const did = String((row as { distributor_id: string }).distributor_id);
    if (did) distIds.add(did);
  }

  const distMap = new Map<string, string>();
  if (distIds.size > 0) {
    const { data: dists, error: de } = await supabase
      .from("master_distributor")
      .select("id, nama_pt")
      .in("id", [...distIds]);
    if (!de) {
      for (const d of dists ?? []) {
        distMap.set(
          String((d as { id: string }).id),
          String((d as { nama_pt?: string }).nama_pt ?? "").trim()
        );
      }
    }
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
    lot: string | null;
    ukuran: string | null;
    ed: string | null;
  }[] = [];

  for (const m of activeMasters) {
    const children = byMaster.get(m.id) ?? [];
    const distFromMaster = m.distributor_id
      ? distMap.get(String(m.distributor_id)) ?? null
      : null;

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
        distributor_nama: distFromMaster,
        lot: null,
        ukuran: null,
        ed: null,
      });
      continue;
    }

    for (const db of children) {
      const did = String(db.distributor_id);
      const dn = distMap.get(did) || null;
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
        distributor_nama: dn,
        lot: db.lot?.trim() || null,
        ukuran: db.ukuran?.trim() || null,
        ed: db.ed?.trim() || null,
      });
    }
  }

  return NextResponse.json({ ok: true, items });
}
