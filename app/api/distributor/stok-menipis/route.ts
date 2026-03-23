import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

function pairKey(distributorId: unknown, masterBarangId: unknown) {
  return `${String(distributorId ?? "")}::${String(masterBarangId ?? "")}`;
}

/** Ambil batas minimum efektif: prioritas distributor_barang, lalu inventaris jika > 0. */
function effectiveMinStock(
  r: Record<string, unknown>,
  thresholdMap: Map<string, number>,
): number | null {
  const key = pairKey(r.distributor_id, r.master_barang_id);
  if (thresholdMap.has(key)) {
    const v = thresholdMap.get(key)!;
    if (!Number.isFinite(v) || v <= 0) return null;
    return v;
  }
  const inv = Number(r?.min_stok ?? 0);
  if (!Number.isFinite(inv) || inv <= 0) return null;
  return inv;
}

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

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
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const kategoriFilter = (searchParams.get("kategori") ?? "").trim();
  const statusFilter = (searchParams.get("status") ?? "all").trim().toLowerCase();

  const pageRaw = searchParams.get("page");
  const pageSizeRaw = searchParams.get("page_size");
  const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1;
  const pageSize = pageSizeRaw
    ? Math.min(100, Math.max(1, parseInt(pageSizeRaw, 10) || 10))
    : null;

  let qInv = supabase
    .from("inventaris")
    .select("id, nama, kategori, satuan, stok, min_stok, lokasi, distributor_id, master_barang_id")
    .eq("lokasi", "Cathlab")
    .order("nama", { ascending: true });

  if (!id.isAdminView) qInv = qInv.eq("distributor_id", id.distributorId);
  else if (distributorIdParam) qInv = qInv.eq("distributor_id", distributorIdParam);

  const { data: invAll, error: errAll } = await qInv;

  if (errAll) {
    return NextResponse.json({ ok: false, message: errAll.message }, { status: 500 });
  }

  const invRows = invAll ?? [];

  let qMap = supabase
    .from("distributor_barang")
    .select("distributor_id, master_barang_id, min_stok, kategori");

  if (!id.isAdminView) {
    qMap = qMap.eq("distributor_id", id.distributorId);
  } else if (distributorIdParam) {
    qMap = qMap.eq("distributor_id", distributorIdParam);
  }

  const { data: mapRows, error: mapErr } = await qMap;
  if (mapErr) return NextResponse.json({ ok: false, message: mapErr.message }, { status: 500 });

  /** Hanya pasangan (distributor, master) yang punya produk di katalog — sama cakupan dengan menu Barang. */
  const mappedKeys = new Set<string>();
  const kategoriByPair = new Map<string, string | null>();
  const thresholdMap = new Map<string, number>();
  for (const r of mapRows ?? []) {
    const key = pairKey(r.distributor_id, r.master_barang_id);
    mappedKeys.add(key);
    if (!kategoriByPair.has(key)) {
      kategoriByPair.set(key, (r as { kategori?: string | null }).kategori ?? null);
    }
    const n = Number((r as { min_stok?: unknown }).min_stok ?? 0);
    if (Number.isFinite(n)) thresholdMap.set(key, n);
  }

  const invCatalogOnly = invRows.filter((r) => {
    const mb = String((r as { master_barang_id?: unknown }).master_barang_id ?? "").trim();
    if (!mb) return false;
    return mappedKeys.has(pairKey((r as { distributor_id?: unknown }).distributor_id, mb));
  });

  const masterIds = [
    ...new Set(
      invCatalogOnly
        .map((r) => String((r as { master_barang_id?: unknown }).master_barang_id ?? "").trim())
        .filter(Boolean),
    ),
  ];

  const masterMap = new Map<string, { nama: string | null }>();
  if (masterIds.length > 0) {
    const { data: masters, error: masterErr } = await supabase
      .from("master_barang")
      .select("id, nama")
      .in("id", masterIds);
    if (masterErr)
      return NextResponse.json({ ok: false, message: masterErr.message }, { status: 500 });
    for (const m of masters ?? []) {
      masterMap.set(String((m as { id: string }).id), {
        nama: (m as { nama?: string | null }).nama ?? null,
      });
    }
  }

  const baseMenipis = invCatalogOnly
    .map((r: Record<string, unknown>) => {
      const minEff = effectiveMinStock(r, thresholdMap);
      if (minEff === null) return null;
      const stok = Number(r?.stok ?? 0);
      if (!Number.isFinite(stok) || stok >= minEff) return null;
      const key = pairKey(r.distributor_id, r.master_barang_id);
      const masterId = String(r.master_barang_id ?? "").trim();
      const master = masterMap.get(masterId);
      return {
        ...r,
        min_stok: minEff,
        /** Sama seperti menu Barang: nama dari master, kategori dari mapping distributor. */
        nama: master?.nama ?? r.nama,
        kategori: kategoriByPair.get(key) ?? r.kategori ?? null,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  const kategoriOptions = Array.from(
    new Set(
      baseMenipis
        .map((r) => r.kategori)
        .filter((k): k is string => k != null && String(k).trim() !== ""),
    ),
  ).sort((a, b) => a.localeCompare(b, "id"));

  let filtered = baseMenipis;

  if (q) {
    filtered = filtered.filter((r) => {
      const nama = String(r.nama ?? "").toLowerCase();
      const kat = String(r.kategori ?? "").toLowerCase();
      return nama.includes(q) || kat.includes(q);
    });
  }

  if (kategoriFilter) {
    filtered = filtered.filter((r) => String(r.kategori ?? "") === kategoriFilter);
  }

  if (statusFilter === "zero") {
    filtered = filtered.filter((r) => Number(r.stok ?? 0) <= 0);
  } else if (statusFilter === "low") {
    filtered = filtered.filter((r) => {
      const s = Number(r.stok ?? 0);
      const m = Number(r.min_stok ?? 0);
      return s > 0 && s < m;
    });
  }

  const distinctKat = new Set<string>();
  for (const r of filtered) {
    const k = r.kategori;
    if (k != null && String(k).trim() !== "") distinctKat.add(String(k));
  }

  const zeroStock = filtered.filter((r) => Number(r.stok ?? 0) <= 0).length;
  const lowNonZero = filtered.filter((r) => {
    const s = Number(r.stok ?? 0);
    const m = Number(r.min_stok ?? 0);
    return s > 0 && s < m;
  }).length;

  const total = filtered.length;

  const summary = {
    total_menipis: total,
    zero_stock: zeroStock,
    low_stock: lowNonZero,
    categories_affected: distinctKat.size,
  };

  let data = filtered;
  if (pageSize !== null) {
    const start = (page - 1) * pageSize;
    data = filtered.slice(start, start + pageSize);
  }

  return NextResponse.json(
    {
      ok: true,
      data,
      total,
      page: pageSize !== null ? page : 1,
      page_size: pageSize,
      summary,
      kategori_options: kategoriOptions,
    },
    { status: 200 },
  );
}
