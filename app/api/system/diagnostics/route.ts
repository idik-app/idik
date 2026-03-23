import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  // NOTE: DiagnosticsBridge adalah client-only zustand store.
  // Endpoint ini sengaja dibatasi agar tidak mengeksekusi logic client dari server.
  return NextResponse.json({
    ok: true,
    message: "Diagnostics endpoint enabled (admin-only)",
    timestamp: new Date().toISOString(),
  });
}
