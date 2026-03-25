"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardSession } from "@/lib/auth/requireDashboardSession";
import { logPasienAudit } from "@/lib/audit/logPasien";

export async function deletePatient(id: string): Promise<void> {
  const session = await requireDashboardSession();
  const supabase = createAdminClient();

  /** `.delete()` tanpa baris terhapus tetap `error: null` — wajib cek hasil `.select()`. */
  const { data: deleted, error } = await supabase
    .from("pasien")
    .delete()
    .eq("id", id)
    .select("id, no_rm, nama");

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error(error.message);
  }

  if (!deleted?.length) {
    throw new Error("Pasien tidak ditemukan atau sudah dihapus.");
  }

  const row = deleted[0];
  await logPasienAudit(
    "DELETE",
    {
      patient_id: id,
      no_rm: row.no_rm ?? undefined,
      nama: row.nama ?? undefined,
    },
    session.username
  );
}
