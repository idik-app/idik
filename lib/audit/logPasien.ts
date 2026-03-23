"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server-";
import { createAdminClient } from "@/lib/supabase/admin";

const MODULE = "dashboard/pasien";
const EVENT_TYPE = "pasien";

export type PasienAuditAction = "CREATE" | "UPDATE" | "DELETE" | "IMPORT";

export type PasienAuditMetadata = {
  patient_id?: string;
  no_rm?: string;
  nama?: string;
  /** Untuk UPDATE: ringkasan perubahan (opsional) */
  changes?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Mencatat aksi CRUD pasien ke tabel audit_log.
 * Dipanggil dari Server Actions addPatient, editPatient, deletePatient.
 * Kegagalan audit hanya di-log ke konsol, tidak melempar error.
 */
export async function logPasienAudit(
  action: PasienAuditAction,
  metadata: PasienAuditMetadata,
  actorOverride?: string
): Promise<void> {
  try {
    let actor = actorOverride ?? "system";
    if (!actorOverride) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) actor = data.user.id;
    }

    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerList.get("x-real-ip") ||
      "unknown";

    const entry = {
      event_type: EVENT_TYPE,
      action,
      module: MODULE,
      actor,
      metadata: { ...metadata },
      status: "success",
      ip_address: ip,
      created_at: new Date().toISOString(),
    };

    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_log").insert(entry);
    if (error) {
      console.error("❌ [audit] logPasienAudit insert error:", error.message);
    }
  } catch (err) {
    console.error("❌ [audit] logPasienAudit failed:", err);
  }
}
