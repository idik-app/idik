import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
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

  let query = supabase
    .from("inventaris")
    .select("id, nama, kategori, satuan, stok, min_stok, lokasi, master_barang_id, distributor_id")
    .eq("lokasi", "Cathlab")
    .order("nama", { ascending: true });

  if (distributorId) {
    query = query.eq("distributor_id", distributorId);
  }

  if (q) {
    query = query.ilike("nama", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
}

