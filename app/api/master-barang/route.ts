import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

type RowWithDist = {
  id: string;
  kode: string | null;
  nama: string | null;
  jenis: string | null;
  kategori: string | null;
  satuan: string | null;
  barcode: string | null;
  distributor_id: string | null;
  is_active: boolean | null;
  /** PostgREST kadang embed sebagai objek tunggal, kadang array relasi 1:n. */
  master_distributor:
    | { nama_pt: string | null }
    | { nama_pt: string | null }[]
    | null;
};

/** Master barang farmasi + nama PT distributor (satu query + embed FK). */
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
      "id, kode, nama, jenis, kategori, satuan, barcode, distributor_id, is_active, master_distributor ( nama_pt )"
    )
    .order("nama", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  const list = (rows ?? []) as unknown as RowWithDist[];
  const active = list.filter((r) => {
    if (r.is_active === false) return false;
    return (r.nama ?? "").trim().length > 0;
  });

  const body = {
    ok: true,
    items: active.map((r) => {
      const did = r.distributor_id ? String(r.distributor_id) : null;
      const embed = r.master_distributor;
      const dn = Array.isArray(embed)
        ? embed[0]?.nama_pt
        : embed?.nama_pt;
      const distributor_nama =
        dn != null && String(dn).trim().length > 0 ? String(dn).trim() : null;
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
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=20, stale-while-revalidate=120",
    },
  });
}
