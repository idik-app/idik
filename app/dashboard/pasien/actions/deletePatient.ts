"use server";

import { createClient } from "@/lib/supabase/server-";
import { logPasienAudit } from "@/lib/audit/logPasien";

export async function deletePatient(id: string): Promise<void> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("pasien")
    .select("id, no_rm, nama")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("pasien").delete().eq("id", id);

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error(error.message);
  }

  const userId = (await supabase.auth.getUser()).data?.user?.id;
  await logPasienAudit(
    "DELETE",
    {
      patient_id: id,
      no_rm: (row as { no_rm?: string })?.no_rm,
      nama: (row as { nama?: string })?.nama,
    },
    userId
  );
}
