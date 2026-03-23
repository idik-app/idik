import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireEnvFlag, requireUser } from "@/lib/auth/guards";

/**
 * 🧠 Audit Log API
 * GET  → ambil 100 log terbaru dari tabel audit_log
 * POST → tambahkan entri audit baru (manual atau sistem)
 */

export async function GET() {
  const disabled = requireEnvFlag("ENABLE_AUDIT_API", "Audit API disabled");
  if (disabled) return disabled.response;

  const id = await requireUser();
  if (!id.ok) return id.response;

  const adminRoles = new Set(["admin", "administrator", "superadmin"]);
  const isAdminTier = adminRoles.has(id.role);

  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("audit_log")
      .select(
        "id, event_type, action, module, actor, metadata, ip_address, status, created_at"
      )
      .order("created_at", { ascending: false });

    // Non-admin hanya boleh melihat log miliknya sendiri.
    if (!isAdminTier) {
      q = q.eq("actor", id.userId);
    }

    const { data, error } = await q.limit(100);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (err: any) {
    console.error("❌ Error fetching audit log:", err.message);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const disabled = requireEnvFlag("ENABLE_AUDIT_API", "Audit API disabled");
  if (disabled) return disabled.response;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const supabase = createAdminClient();
    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for") ||
      headerList.get("x-real-ip") ||
      "unknown";

    const body = await req.json();
    const {
      event_type,
      action,
      module,
      actor = "system",
      metadata = {},
      status = "success",
    } = body;

    if (!event_type && !action)
      return NextResponse.json(
        { ok: false, message: "Missing event_type or action in body" },
        { status: 400 }
      );

    const entry = {
      event_type: event_type || action,
      action: action || event_type,
      module: module || "general",
      actor,
      metadata,
      status,
      ip_address: ip,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_log").insert(entry);
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: "✅ Audit log inserted successfully",
    });
  } catch (err: any) {
    console.error("❌ Error writing audit log:", err.message);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to insert audit log" },
      { status: 500 }
    );
  }
}
