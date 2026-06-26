import type { SupabaseClient } from "@supabase/supabase-js";
import { statusNeedsKeterangan } from "@/app/dashboard/layanan/tindakan/bridge/bridge.constants";

export type TindakanStatusLogRow = {
  id: string;
  tindakan_id: string;
  status: string | null;
  status_keterangan: string | null;
  changed_by: string | null;
  created_at: string;
};

/** Catat perubahan status ke tabel log (gagal silent — tidak memblokir PATCH). */
export async function insertTindakanStatusLog(
  supabase: SupabaseClient,
  input: {
    tindakanId: string;
    status: string | null;
    statusKeterangan: string | null;
    changedBy?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("tindakan_status_log").insert({
    tindakan_id: input.tindakanId,
    status: input.status,
    status_keterangan: input.statusKeterangan,
    changed_by: input.changedBy ?? null,
  });
  if (error) {
    console.error("[tindakan_status_log] insert failed:", error.message);
  }
}

/** Peringatan soft (tidak memblokir simpan) bila keterangan status kosong. */
export function buildStatusKeteranganWarnings(
  status: string | null | undefined,
  statusKeterangan: string | null | undefined,
): string[] {
  const s = String(status ?? "").trim();
  if (!statusNeedsKeterangan(s)) return [];
  const ket = String(statusKeterangan ?? "").trim();
  if (ket) return [];
  return [
    `Status "${s}" disarankan diisi dengan keterangan status, tetapi penyimpanan tetap diizinkan.`,
  ];
}
