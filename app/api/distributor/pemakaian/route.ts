import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function masterBarangDistId(inv: {
  master_barang?: { distributor_id?: string | null } | { distributor_id?: string | null }[] | null;
}): string {
  const mb = inv?.master_barang;
  const row = Array.isArray(mb) ? mb[0] : mb;
  const d = row?.distributor_id;
  if (d == null || d === "") return "";
  return String(d);
}

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const scope = id.isAdminView ? (distributorIdParam || null) : (id.distributorId ?? null);
  const adminShowAll = Boolean(id.isAdminView && !scope);

  if (!id.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Akun distributor tidak terikat ke master PT." },
      { status: 403 },
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

  /** Master barang yang ada di katalog distributor (fallback jika inventaris.distributor_id kosong). */
  let catalogMasterIds = new Set<string>();
  if (!adminShowAll && scope) {
    const { data: dbRows, error: dbErr } = await supabase
      .from("distributor_barang")
      .select("master_barang_id")
      .eq("distributor_id", scope);
    if (dbErr) {
      return NextResponse.json({ ok: false, message: dbErr.message }, { status: 500 });
    }
    for (const r of dbRows ?? []) {
      const mb = String((r as { master_barang_id?: unknown }).master_barang_id ?? "").trim();
      if (mb) catalogMasterIds.add(mb);
    }
  }

  let q = supabase
    .from("pemakaian")
    .select(
      `
      id,
      created_at,
      inventaris_id,
      jumlah,
      tanggal,
      keterangan,
      tindakan_id,
      inventaris!inner (
        id,
        nama,
        satuan,
        lokasi,
        distributor_id,
        master_barang_id,
        master_barang (
          distributor_id
        )
      )
    `,
    )
    .eq("inventaris.lokasi", "Cathlab")
    .order("tanggal", { ascending: false });

  if (from) q = q.gte("tanggal", from);
  if (to) q = q.lte("tanggal", to);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const scopeStr = scope ? String(scope) : "";

  function rowForTenant(row: Record<string, unknown>): boolean {
    if (adminShowAll) return true;
    const inv = row.inventaris as
      | {
          distributor_id?: string | null;
          master_barang_id?: string | null;
          master_barang?: unknown;
        }
      | null
      | undefined;
    if (!inv) return false;

    const invDist =
      inv.distributor_id != null && inv.distributor_id !== ""
        ? String(inv.distributor_id)
        : "";
    if (invDist === scopeStr) return true;

    const mbId =
      inv.master_barang_id != null && inv.master_barang_id !== ""
        ? String(inv.master_barang_id)
        : "";
    const masterDist = masterBarangDistId(inv);

    if (!invDist && masterDist === scopeStr) return true;

    if (!invDist && !masterDist && mbId && catalogMasterIds.has(mbId)) return true;

    return false;
  }

  const filtered = (data ?? []).filter((row) => rowForTenant(row as Record<string, unknown>));

  const enriched = filtered.map((row: any) => {
    const inv = row.inventaris as {
      nama?: string;
      satuan?: string | null;
    } | null;
    return {
      id: row.id,
      created_at: row.created_at,
      inventaris_id: row.inventaris_id,
      jumlah: row.jumlah,
      tanggal: row.tanggal,
      keterangan: row.keterangan,
      tindakan_id: row.tindakan_id,
      inventaris: inv
        ? { nama: inv.nama ?? "-", satuan: (inv.satuan as string | null) ?? null }
        : null,
    };
  });

  return NextResponse.json({ ok: true, data: enriched }, { status: 200 });
}
