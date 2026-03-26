import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const barcode = (searchParams.get("barcode") ?? "").trim();

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  const selectCols =
    "id, kode, nama, kategori, satuan, jenis, is_active, barcode";

  /** Lookup tepat untuk hasil scan (barcode kemasan di master_barang). */
  if (barcode) {
    const { data, error } = await supabase
      .from("master_barang")
      .select(selectCols)
      .eq("is_active", true)
      .eq("barcode", barcode)
      .limit(5);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  }

  const safeQ = q.replace(/,/g, " ").trim();
  /** Pencarian teks butuh lebih banyak baris mentah agar setelah dedupe nama dagang masih beragam (bukan puluhan varian kode sama). */
  const textSearchLimit = safeQ ? 80 : 30;

  let query = supabase
    .from("master_barang")
    .select(selectCols)
    .eq("is_active", true)
    .order("nama", { ascending: true })
    .limit(textSearchLimit);

  if (safeQ) {
    const esc = safeQ
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    const pat = `%${esc}%`;
    query = query.or(`nama.ilike.${pat},kode.ilike.${pat},barcode.ilike.${pat}`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
}

