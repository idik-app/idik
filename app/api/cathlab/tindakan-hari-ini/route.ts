import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";

/** Tanggal lokal Asia/Jakarta sebagai YYYY-MM-DD */
function todayJakartaDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Daftar tindakan Cathlab yang tanggalnya = hari ini (WIB) — untuk memilih pasien + konteks PCI/diagnostik.
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 }
    );
  }

  const tanggal = todayJakartaDateString();

  /**
   * Skema `tindakan` di produksi bisa tanpa `waktu`, `created_at`, dll.
   * Hanya kolom yang umum dipakai filter + label; urutan `id` DESC (stabil tanpa timestamp).
   */
  const { data, error } = await supabase
    .from("tindakan")
    .select(
      "id, tanggal, nama_pasien, no_rm, tindakan, kategori, status, ruangan, pasien_id"
    )
    .eq("tanggal", tanggal)
    .order("id", { ascending: false });

  if (error) {
    console.error("[tindakan-hari-ini]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  type Raw = {
    id: string;
    tanggal: string | null;
    nama_pasien: string | null;
    no_rm: string | null;
    tindakan: string | null;
    kategori: string | null;
    status: string | null;
    ruangan: string | null;
    pasien_id: string | null;
  };

  const rows = (data ?? []).map((r: Raw) => ({
    id: r.id,
    tanggal: r.tanggal,
    waktu: null,
    nama_pasien: r.nama_pasien,
    no_rm: r.no_rm,
    tindakan: r.tindakan,
    kategori: r.kategori,
    status: r.status,
    ruangan: r.ruangan,
    pasien_id: r.pasien_id,
  }));

  return NextResponse.json({
    ok: true,
    tanggal,
    rows,
  });
}
