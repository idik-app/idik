import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEnvFlag, requireUser } from "@/lib/auth/guards";

type Body = {
  event_type?: string;
  action?: string;
  module?: string;
  metadata?: unknown;
  status?: string;
};

export async function POST(req: Request) {
  const disabled = requireEnvFlag("ENABLE_AUDIT_API", "Audit API disabled");
  if (disabled) return disabled.response;

  const id = await requireUser();
  if (!id.ok) return id.response;

  try {
    const body = (await req.json()) as Body;
    const { event_type, action, module, metadata, status } = body ?? {};

    if (!event_type && !action) {
      return NextResponse.json(
        { ok: false, message: "Missing event_type or action in body" },
        { status: 400 }
      );
    }

    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for") ||
      headerList.get("x-real-ip") ||
      "unknown";

    const entry = {
      event_type: event_type || action,
      action: action || event_type,
      module: module || "general",
      actor: id.userId,
      metadata: {
        ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
        role: id.role,
      },
      status: status || "success",
      ip_address: ip,
      created_at: new Date().toISOString(),
    };

    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_log").insert(entry);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Error writing system audit log:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to insert audit log" },
      { status: 500 }
    );
  }
}

