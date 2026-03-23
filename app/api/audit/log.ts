// app/api/audit/log.ts
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * logAudit
 * Mencatat aktivitas API ke tabel `audit_log` (sama dengan /api/audit/log route).
 * Kolom: event_type, action, module, actor, metadata, ip_address, status, created_at
 */
export async function logAudit(
  action: string,
  details: Record<string, unknown> = {},
  userId?: string
) {
  try {
    const supabase = createAdminClient();
    const hdr = await headers();
    const endpoint = hdr.get("x-invoke-path") || "unknown";
    const ip =
      hdr.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdr.get("cf-connecting-ip") ||
      "0.0.0.0";

    await supabase.from("audit_log").insert({
      event_type: action,
      action,
      module: endpoint,
      actor: userId ?? "system",
      metadata: details,
      ip_address: ip,
      status: "success",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
