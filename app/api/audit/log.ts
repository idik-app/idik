// app/api/audit/log.ts
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * logAudit
 * Mencatat aktivitas API ke tabel `audit_logs`.
 * Tabel wajib memiliki kolom:
 * id | timestamp | user_id | action | endpoint | ip | details
 */
export async function logAudit(
  action: string,
  details: any = {},
  userId?: string
) {
  try {
    const supabase = createClient();

    // Ambil header request
    const hdr = await headers();
    const endpoint = hdr.get("x-invoke-path") || "unknown";
    const ip =
      hdr.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdr.get("cf-connecting-ip") ||
      "0.0.0.0";

    // Simpan ke tabel
    await supabase.from("audit_logs").insert([
      {
        user_id: userId ?? "system",
        action,
        endpoint,
        ip,
        details,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
