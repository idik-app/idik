import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

/** Master barang farmasi + nama PT distributor (join `master_distributor`). */
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

  const { data: rows, error } = await supabase
    .from("master_barang")
    .select(
      "id, kode, nama, jenis, kategori, satuan, barcode, distributor_id, is_active"
    )
    .order("nama", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  const active = (rows ?? []).filter((r) => {
    if (r.is_active === false) return false;
    return (r.nama ?? "").trim().length > 0;
  });

  const distIds = [
    ...new Set(
      active
        .map((r) => r.distributor_id)
        .filter((id): id is string => Boolean(id && String(id).trim()))
    ),
  ];

  const distMap = new Map<string, string>();
  if (distIds.length > 0) {
    const { data: dists, error: de } = await supabase
      .from("master_distributor")
      .select("id, nama_pt")
      .in("id", distIds);
    if (!de) {
      for (const d of dists ?? []) {
        const id = d.id as string;
        const nama = (d as { nama_pt?: string | null }).nama_pt ?? "";
        distMap.set(id, String(nama).trim());
      }
    }
  }

  return NextResponse.json({
    ok: true,
    items: active.map((r) => {
      const did = r.distributor_id ? String(r.distributor_id) : null;
      const distributor_nama =
        did && distMap.has(did) ? distMap.get(did)! : null;
      return {
        id: r.id as string,
        kode: (r.kode as string) ?? "",
        nama: (r.nama as string) ?? "",
        jenis: (r.jenis as string) ?? "",
        kategori: (r.kategori as string | null) ?? null,
        satuan: (r.satuan as string | null) ?? null,
        barcode: (r.barcode as string | null) ?? null,
        distributor_id: did,
        distributor_nama: distributor_nama || null,
      };
    }),
  });
}
