import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const distributorId = id.isAdminView ? (distributorIdParam || null) : (id.distributorId ?? null);

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  // Ambil pemakaian Cathlab. Untuk distributor: dibatasi inventaris milik tenant.
  // Untuk admin: bisa semua, atau filter by distributor_id via query param.
  // Catatan: ini butuh kolom inventaris.distributor_id (ditambah via migration 20260317000000).
  let invQuery = supabase.from("inventaris").select("id").eq("lokasi", "Cathlab");
  if (!id.isAdminView) {
    invQuery = invQuery.eq("distributor_id", id.distributorId!);
  } else if (distributorId) {
    invQuery = invQuery.eq("distributor_id", distributorId);
  }
  const invRes = await invQuery;

  if (invRes.error) {
    return NextResponse.json({ ok: false, message: invRes.error.message }, { status: 500 });
  }

  const invIds = (invRes.data ?? []).map((r: any) => r.id);
  if (invIds.length === 0) return NextResponse.json({ ok: true, data: [] }, { status: 200 });

  let q = supabase
    .from("pemakaian")
    .select("id, created_at, inventaris_id, jumlah, tanggal, keterangan, tindakan_id")
    .in("inventaris_id", invIds)
    .order("tanggal", { ascending: false });

  if (from) q = q.gte("tanggal", from);
  if (to) q = q.lte("tanggal", to);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Enrich nama barang dari inventaris (biar UI enak)
  const invNameRes = await supabase
    .from("inventaris")
    .select("id, nama, satuan")
    .in("id", invIds);

  const invMap = new Map<string, { nama: string; satuan: string | null }>();
  for (const r of invNameRes.data ?? []) invMap.set(r.id as any, { nama: (r as any).nama, satuan: (r as any).satuan ?? null });

  const enriched = (data ?? []).map((row: any) => ({
    ...row,
    inventaris: invMap.get(row.inventaris_id) ?? null,
  }));

  return NextResponse.json({ ok: true, data: enriched }, { status: 200 });
}

